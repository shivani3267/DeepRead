from app.classification.answerability import (
    ThresholdBaselineClassifier,
    LogisticRegressionClassifier,
    answerability_service,
)

def test_baseline_classifier_high_score():
    clf = ThresholdBaselineClassifier(threshold=0.30)
    features = {
        "top_score": 0.45,
        "second_score": 0.35,
        "score_diff": 0.10,
        "chunk_count": 4,
    }
    result = clf.classify(features)
    assert result["is_answerable"] is True

def test_baseline_classifier_low_score_abstains():
    clf = ThresholdBaselineClassifier(threshold=0.30)
    features = {
        "top_score": 0.12,
        "second_score": 0.11,
        "score_diff": 0.01,
        "chunk_count": 2,
    }
    result = clf.classify(features)
    assert result["is_answerable"] is False

def test_logistic_regression_classifier():
    clf = LogisticRegressionClassifier()
    features = {
        "top_score": 0.42,
        "second_score": 0.30,
        "score_diff": 0.12,
        "mean_top_k": 0.32,
        "chunk_count": 5,
        "query_length": 35,
    }
    result = clf.classify(features)
    assert "probability" in result
    assert result["is_answerable"] is True

def test_combined_answerability_service():
    features = {
        "top_score": 0.45,
        "second_score": 0.32,
        "score_diff": 0.13,
        "mean_top_k": 0.35,
        "chunk_count": 5,
        "query_length": 40,
    }
    evaluation = answerability_service.evaluate_retrieval(features)
    assert evaluation["is_answerable"] is True
    assert "baseline" in evaluation
    assert "logistic_regression" in evaluation
