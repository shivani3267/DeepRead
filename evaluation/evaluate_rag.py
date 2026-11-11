import json
import time
import sys
from pathlib import Path

# Add ai-service to path
AI_SERVICE_DIR = Path(__file__).resolve().parent.parent / "ai-service"
sys.path.insert(0, str(AI_SERVICE_DIR))

from app.ingestion.pdf_extractor import pdf_extractor
from app.ingestion.chunker import academic_chunker
from app.embeddings.embedding_service import embedding_service
from app.vector_store.pinecone_client import vector_store
from app.retrieval.retriever import academic_retriever
from app.classification.answerability import answerability_service
from app.generation.llm_provider import MockLLMProvider, get_llm_provider
from app.citations.verifier import citation_verifier

DATASET_PATH = Path(__file__).resolve().parent / "dataset.json"
STORAGE_DOCS = Path(__file__).resolve().parent.parent / "storage" / "documents"

def setup_evaluation_index():
    """Extracts and indexes all sample documents into the vector store for evaluation"""
    print("[Evaluation Setup] Indexing sample academic documents into vector store...")
    pdf_files = list(STORAGE_DOCS.glob("*.pdf"))

    indexed_docs = {}
    for pdf_path in pdf_files:
        name = pdf_path.name.lower()
        if "quantum" in name:
            doc_id = "doc_quantum"
            title = "Introduction to Quantum Information Science"
            scope = "public"
        elif "machine" in name:
            doc_id = "doc_ml"
            title = "Foundations of Statistical Machine Learning"
            scope = "student"
        elif "faculty" in name:
            doc_id = "doc_faculty"
            title = "Institutional Faculty Research Ethics and Consulting Policy"
            scope = "faculty"
        else:
            continue

        pages = pdf_extractor.extract(str(pdf_path))
        chunks = academic_chunker.chunk_pages(
            pages=pages,
            document_id=doc_id,
            version_id="v1",
            extra_metadata={"title": title, "access_scope": scope},
        )
        texts = [c["text"] for c in chunks]
        embs = embedding_service.embed_texts(texts)
        vector_store.upsert_chunks(chunks, embs)
        indexed_docs[title] = doc_id
        print(f"  Indexed '{title}' ({len(pages)} pages, {len(chunks)} chunks)")

    return indexed_docs

async def run_evaluation():
    indexed_docs = setup_evaluation_index()

    with open(DATASET_PATH, "r", encoding="utf-8") as f:
        dataset = json.load(f)

    print(f"\n========================================================")
    print(f"  Running DeepRead RAG Evaluation ({len(dataset)} Test Cases)  ")
    print(f"========================================================\n")

    authorized_docs = list(indexed_docs.values())

    recalls_at_1 = []
    recalls_at_3 = []
    recalls_at_5 = []
    mrr_scores = []
    abstention_correct = []
    citation_precisions = []
    latencies = []

    results_log = []

    llm = MockLLMProvider() if "--ollama" not in sys.argv else get_llm_provider()

    for item in dataset:
        qid = item["id"]
        qtype = item["type"]
        query = item["query"]
        expected_abstain = item.get("expected_abstain", False)
        expected_doc_title = item.get("expected_document_name")
        expected_page = item.get("expected_page")

        # For role restriction test case, remove faculty document
        current_authorized = [d for d in authorized_docs if d != "doc_faculty"] if qtype == "role_restriction" else authorized_docs

        start_time = time.time()

        # 1. Retrieval
        retrieval_res = academic_retriever.retrieve(
            query=query,
            authorized_document_ids=current_authorized,
            top_k=5,
        )
        chunks = retrieval_res["chunks"]
        features = retrieval_res["features"]

        # 2. Answerability classification
        answerability = answerability_service.evaluate_retrieval(features)
        is_answerable = answerability["is_answerable"] and len(chunks) > 0

        # 3. Generation & Verification
        actual_abstain = not is_answerable
        answer = ""
        citations = []

        if is_answerable:
            raw_answer = await llm.generate_answer(query, chunks)
            if "insufficient evidence" in raw_answer.lower():
                actual_abstain = True
                answer = raw_answer
            else:
                answer, citations = citation_verifier.verify(raw_answer, chunks)
        else:
            answer = "Insufficient evidence."

        latency_ms = (time.time() - start_time) * 1000
        latencies.append(latency_ms)

        # Metrics computation
        if expected_abstain:
            is_abstention_accurate = actual_abstain
            abstention_correct.append(1 if is_abstention_accurate else 0)
        else:
            # Measure Recall@k & MRR for answerable questions
            retrieved_pages = [(c["document_id"], c["page_number"]) for c in chunks]
            expected_doc_id = indexed_docs.get(expected_doc_title)
            target_tuple = (expected_doc_id, expected_page)

            # Check positions
            hit_rank = None
            for rank_idx, (r_doc, r_page) in enumerate(retrieved_pages, 1):
                if r_doc == expected_doc_id and (expected_page is None or r_page == expected_page):
                    hit_rank = rank_idx
                    break

            r1 = 1 if hit_rank == 1 else 0
            r3 = 1 if (hit_rank and hit_rank <= 3) else 0
            r5 = 1 if (hit_rank and hit_rank <= 5) else 0
            mrr = (1.0 / hit_rank) if hit_rank else 0.0

            recalls_at_1.append(r1)
            recalls_at_3.append(r3)
            recalls_at_5.append(r5)
            mrr_scores.append(mrr)

            # Citation Precision
            if citations:
                valid_cit = sum(1 for c in citations if c.get("is_validated"))
                citation_precisions.append(valid_cit / len(citations))
            else:
                citation_precisions.append(1.0 if not actual_abstain else 0.0)

        status_str = "PASS" if (actual_abstain == expected_abstain) else "WARN"
        print(f"[{qid}] {qtype.upper()[:12]:12} | {status_str} | Latency: {latency_ms:.1f}ms | Query: {query[:50]}...")

        results_log.append({
            "id": qid,
            "type": qtype,
            "query": query,
            "expected_abstain": expected_abstain,
            "actual_abstain": actual_abstain,
            "latency_ms": round(latency_ms, 1),
            "citations_count": len(citations),
        })

    # Summary Metrics
    mean_r1 = (sum(recalls_at_1) / len(recalls_at_1)) if recalls_at_1 else 0.0
    mean_r3 = (sum(recalls_at_3) / len(recalls_at_3)) if recalls_at_3 else 0.0
    mean_r5 = (sum(recalls_at_5) / len(recalls_at_5)) if recalls_at_5 else 0.0
    mean_mrr = (sum(mrr_scores) / len(mrr_scores)) if mrr_scores else 0.0
    abstention_acc = (sum(abstention_correct) / len(abstention_correct)) if abstention_correct else 1.0
    mean_cit_prec = (sum(citation_precisions) / len(citation_precisions)) if citation_precisions else 1.0
    mean_latency = sum(latencies) / len(latencies)

    print("\n========================================================")
    print("               EVALUATION BENCHMARK RESULTS             ")
    print("========================================================")
    print(f"  Recall@1:             {mean_r1 * 100:.2f}%")
    print(f"  Recall@3:             {mean_r3 * 100:.2f}%")
    print(f"  Recall@5:             {mean_r5 * 100:.2f}%")
    print(f"  MRR (Mean Recip Rank): {mean_mrr:.4f}")
    print(f"  Citation Precision:   {mean_cit_prec * 100:.2f}%")
    print(f"  Abstention Accuracy:  {abstention_acc * 100:.2f}%")
    print(f"  Mean Response Latency: {mean_latency:.2f} ms")
    print("========================================================\n")

    report = {
        "timestamp": time.strftime("%Y-%m-%d %H:%M:%S"),
        "total_queries": len(dataset),
        "metrics": {
            "recall_at_1": round(mean_r1, 4),
            "recall_at_3": round(mean_r3, 4),
            "recall_at_5": round(mean_r5, 4),
            "mrr": round(mean_mrr, 4),
            "citation_precision": round(mean_cit_prec, 4),
            "abstention_accuracy": round(abstention_acc, 4),
            "mean_latency_ms": round(mean_latency, 2),
        },
        "query_results": results_log,
    }

    out_file = Path(__file__).resolve().parent / "evaluation_report.json"
    with open(out_file, "w", encoding="utf-8") as f:
        json.dump(report, f, indent=2)

    print(f"Saved evaluation report to {out_file}")

if __name__ == "__main__":
    import asyncio
    asyncio.run(run_evaluation())
