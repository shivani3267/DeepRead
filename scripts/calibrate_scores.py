import json
import sys
from pathlib import Path

sys.path.insert(0, str(Path(__file__).resolve().parent.parent / "ai-service"))
sys.path.insert(0, str(Path(__file__).resolve().parent.parent / "evaluation"))

from app.retrieval.retriever import academic_retriever
from evaluate_rag import setup_evaluation_index

docs = setup_evaluation_index()
with open(Path(__file__).resolve().parent.parent / "evaluation" / "dataset.json") as f:
    data = json.load(f)

print("\n--- Answerable Queries ---")
for item in data[:6]:
    res = academic_retriever.retrieve(item['query'], list(docs.values()))
    feat = res['features']
    print(f"{item['id']}: top={feat['top_score']}, diff={feat['score_diff']}")

print("\n--- Unanswerable Queries ---")
for item in data[13:17]:
    res = academic_retriever.retrieve(item['query'], list(docs.values()))
    feat = res['features']
    print(f"{item['id']}: top={feat['top_score']}, diff={feat['score_diff']}")
