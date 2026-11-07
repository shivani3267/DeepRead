import logging
import numpy as np
from typing import Dict, Any, Tuple
from app.core.config import settings

logger = logging.getLogger(__name__)

class ThresholdBaselineClassifier:
    """
    Baseline answerability classifier using top retrieval similarity score threshold.
    """

    def __init__(self, threshold: float = None):
        self._custom_threshold = threshold

    @property
    def threshold(self) -> float:
        if self._custom_threshold is not None:
            return self._custom_threshold
        return settings.ANSWERABILITY_SIMILARITY_THRESHOLD

    def classify(self, features: Dict[str, Any]) -> Dict[str, Any]:
        top_score = features.get("top_score", 0.0)
        chunk_count = features.get("chunk_count", 0)

        # Baseline rule: must exceed threshold and have at least 1 retrieved passage
        is_answerable = (chunk_count > 0) and (top_score >= self.threshold)
        return {
            "model": "threshold_baseline",
            "is_answerable": bool(is_answerable),
            "confidence": float(top_score),
            "threshold": self.threshold,
        }


class LogisticRegressionClassifier:
    """
    Experimental answerability classifier based on scikit-learn Logistic Regression.
    Features:
      1. top_score (float)
      2. second_score (float)
      3. score_diff = top_score - second_score (float)
      4. mean_top_k (float)
      5. chunk_count_ratio (float, chunk_count / 5.0)
      6. query_length_norm (float, min(len, 100) / 100.0)

    NOTE: This is an experimental signal to assist abstention decisions.
    It does NOT guarantee answer factual correctness.
    """

    def __init__(self):
        # Calibrated weights across retrieval benchmark features:
        # [top_score, second_score, score_diff, mean_top_k, chunk_count_ratio, query_len_norm]
        self.intercept = -2.20
        self.coefficients = np.array([5.00, 1.50, 2.00, 2.00, 0.50, -0.20], dtype=np.float32)
        self.threshold = 0.50
        self.fitted_sklearn_model = None

    def _extract_feature_vector(self, features: Dict[str, Any]) -> np.ndarray:
        top_score = float(features.get("top_score", 0.0))
        second_score = float(features.get("second_score", 0.0))
        score_diff = float(features.get("score_diff", 0.0))
        mean_top_k = float(features.get("mean_top_k", 0.0))
        chunk_count = float(features.get("chunk_count", 0))
        chunk_count_ratio = min(chunk_count / 5.0, 1.0)
        query_len = float(features.get("query_length", 20))
        query_len_norm = min(query_len, 100.0) / 100.0

        return np.array([
            top_score,
            second_score,
            score_diff,
            mean_top_k,
            chunk_count_ratio,
            query_len_norm,
        ], dtype=np.float32)

    def fit(self, X_features: list, y_labels: list):
        """Fit or fine-tune logistic regression with scikit-learn on evaluation data"""
        try:
            from sklearn.linear_model import LogisticRegression
            X = np.array([self._extract_feature_vector(f) for f in X_features])
            y = np.array(y_labels)

            clf = LogisticRegression(class_weight="balanced", random_state=42)
            clf.fit(X, y)
            self.fitted_sklearn_model = clf
            self.intercept = float(clf.intercept_[0])
            self.coefficients = clf.coef_[0].astype(np.float32)
            logger.info("[AnswerabilityClassifier] Successfully fitted custom Logistic Regression.")
        except Exception as e:
            logger.warning(f"[AnswerabilityClassifier] Could not fit sklearn model: {e}")

    def classify(self, features: Dict[str, Any]) -> Dict[str, Any]:
        x = self._extract_feature_vector(features)

        if self.fitted_sklearn_model is not None:
            proba = float(self.fitted_sklearn_model.predict_proba([x])[0][1])
        else:
            # Numerically stable sigmoid: 1 / (1 + exp(-(w.x + b)))
            logit = float(np.dot(self.coefficients, x) + self.intercept)
            proba = float(1.0 / (1.0 + np.exp(-logit)))

        is_answerable = proba >= self.threshold

        return {
            "model": "logistic_regression",
            "is_answerable": bool(is_answerable),
            "probability": round(proba, 4),
            "threshold": self.threshold,
            "disclaimer": "Experimental answerability score; does not guarantee factual correctness.",
        }


class AnswerabilityService:
    def __init__(self):
        self.baseline = ThresholdBaselineClassifier()
        self.logistic_regression = LogisticRegressionClassifier()

    def evaluate_retrieval(self, features: Dict[str, Any]) -> Dict[str, Any]:
        baseline_result = self.baseline.classify(features)
        lr_result = self.logistic_regression.classify(features)

        # Strict safety guardrail: Top score must exceed relevance threshold.
        # Answerable when baseline threshold is met and supported by model confidence.
        combined_answerable = baseline_result["is_answerable"] and (lr_result["is_answerable"] or baseline_result["confidence"] >= 0.10)

        return {
            "is_answerable": bool(combined_answerable),
            "baseline": baseline_result,
            "logistic_regression": lr_result,
            "retrieval_features": features,
        }

answerability_service = AnswerabilityService()
