import fitz  # PyMuPDF
from pathlib import Path

STORAGE_DIR = Path(__file__).resolve().parent.parent / "storage" / "sample_docs"
STORAGE_DIR.mkdir(parents=True, exist_ok=True)

def create_pdf(filename: str, title: str, pages_content: list):
    doc = fitz.open()
    for page_idx, content in enumerate(pages_content):
        page = doc.new_page(width=595, height=842)  # Standard A4
        page_num = page_idx + 1

        # Header
        header_rect = fitz.Rect(50, 40, 545, 65)
        page.insert_textbox(header_rect, f"{title} — Page {page_num}", fontsize=9, color=(0.4, 0.4, 0.4))

        # Main content body
        body_rect = fitz.Rect(50, 80, 545, 760)
        page.insert_textbox(body_rect, content, fontsize=11, fontname="helv", lineheight=1.4)

        # Footer
        footer_rect = fitz.Rect(50, 780, 545, 805)
        page.insert_textbox(footer_rect, f"DeepRead Academic Library Archive • Page {page_num} of {len(pages_content)}", fontsize=9, color=(0.5, 0.5, 0.5))

    out_path = STORAGE_DIR / filename
    doc.save(str(out_path))
    doc.close()
    print(f"Generated academic PDF: {out_path} ({len(pages_content)} pages)")
    return out_path

# Document 1: Quantum Computing (Public / Student accessible)
quantum_pages = [
    """1. Introduction to Quantum Information Science

Quantum computing represents a paradigm shift from classical information theory. Classical computers encode information in binary digits, or bits, which assume a deterministic value of either 0 or 1 at any given computational instant.

In stark contrast, quantum computers leverage the quantum mechanical principle of state superposition. A quantum bit, or qubit, exists in a two-dimensional complex Hilbert space. The state of a qubit is mathematically represented as:
|psi> = alpha |0> + beta |1>

where alpha and beta are complex probability amplitudes satisfying the normalization constraint |alpha|^2 + |beta|^2 = 1. The quantities |alpha|^2 and |beta|^2 dictate the probability of observing states |0> and |1> respectively upon measurement in the computational Z-basis.

This linear superposition allows an n-qubit register to simultaneously span a 2^n dimensional state space, providing an exponential representational capacity unattainable in classical systems.""",

    """2. Quantum Entanglement and Bell States

Entanglement is a purely quantum mechanical phenomenon wherein the collective quantum state of multiple particles cannot be decomposed into a tensor product of their individual single-particle states.

Mathematically, for a bipartite system A and B, a state |psi_AB> is entangled if:
|psi_AB> != |phi_A> (x) |phi_B>

The canonical maximally entangled two-qubit states are known as the four Bell states or EPR pairs:
|Phi+> = (|00> + |11>) / sqrt(2)
|Phi-> = (|00> - |11>) / sqrt(2)
|Psi+> = (|01> + |10>) / sqrt(2)
|Psi-> = (|01> - |10>) / sqrt(2)

Entangled qubits exhibit nonlocal quantum correlations that violate Bell's inequalities (CHSH inequality threshold exceeding the classical bound of 2 up to Tsirelson's bound of 2*sqrt(2)). Entanglement serves as the fundamental resource for quantum teleportation, superdense coding, and distributed quantum key distribution protocols.""",

    """3. Quantum Logic Gates and Reversible Computation

Because time evolution in closed quantum systems is governed by the Schrödinger equation, all quantum operations must be unitary and therefore strictly reversible. A quantum gate acting on n qubits corresponds to a 2^n x 2^n unitary matrix U such that U^dagger U = I.

Crucial Single-Qubit Gates:
- The Pauli-X Gate (bit-flip): Maps |0> to |1> and |1> to |0>. Matrix: [[0, 1], [1, 0]].
- The Pauli-Z Gate (phase-flip): Leaves |0> unchanged and maps |1> to -|1>. Matrix: [[1, 0], [0, -1]].
- The Hadamard Gate (H): Creates an equal superposition from computational basis states. H|0> = (|0> + |1>) / sqrt(2), and H|1> = (|0> - |1>) / sqrt(2).

Crucial Multi-Qubit Gates:
- Controlled-NOT (CNOT) Gate: Flips the target qubit if and only if the control qubit is in state |1>. When combined with arbitrary single-qubit rotations, the CNOT gate forms a universal set of quantum gates for quantum computation.""",

    """4. Quantum Teleportation Protocol

Quantum teleportation enables the transmission of an unknown quantum state |psi> = alpha |0> + beta |1> from sender Alice to receiver Bob without physically transferring the underlying physical particle, provided Alice and Bob share an entangled Bell pair |Phi+>.

Protocol Execution Steps:
Step 1: Alice holds the unknown qubit |psi> and one half of the shared Bell pair. Bob holds the other half.
Step 2: Alice applies a CNOT gate between |psi> and her Bell qubit, followed by a Hadamard gate on |psi>.
Step 3: Alice performs a projective Bell-basis measurement on her two qubits, yielding one of four classical bit outcomes: 00, 01, 10, or 11.
Step 4: Alice transmits the two classical measurement bits to Bob via a classical channel.
Step 5: Based on the received classical bits, Bob applies a corrective Pauli operator (I, X, Z, or ZX) to reconstruct state |psi> on his qubit.

Crucially, quantum teleportation does not violate the relativistic speed of light because the classical transmission of two bits is strictly necessary to reconstruct the quantum state.""",

    """5. Foundational Quantum Algorithms

Several algorithms demonstrate verifiable quantum advantages over optimal classical algorithms:

- Shor's Factoring Algorithm: Solves the integer factorization problem in polynomial time O((log N)^3) by reducing factoring to order-finding using the Quantum Fourier Transform (QFT). This represents an exponential speedup over the best known classical algorithm, the General Number Field Sieve.

- Grover's Search Algorithm: Solves the unstructured search problem over an unsorted database of N entries in O(sqrt(N)) evaluations of the oracle function, representing a quadratic speedup over classical brute-force search O(N).

- Quantum Phase Estimation (QPE): Approximates the eigenvalue corresponding to an eigenvector of a unitary matrix, forming the underlying subroutine in Shor's algorithm and Hamiltonian simulation for quantum chemistry."""
]

# Document 2: Machine Learning Fundamentals (Public / Student accessible)
ml_pages = [
    """1. Overview of Machine Learning Paradigms

Machine learning is a subfield of artificial intelligence concerned with algorithms that improve their performance metric P on a specified class of tasks T through empirical experience E.

Taxonomy of Machine Learning:
1. Supervised Learning: The algorithm is presented with an annotated training dataset D = {(x_i, y_i)} for i = 1 to N, where x_i in R^d represents input feature vectors and y_i represents ground truth labels.
   - Classification: Discrete target labels y in {1, 2, ..., C}.
   - Regression: Continuous real-valued targets y in R.

2. Unsupervised Learning: The algorithm receives unlabeled inputs X = {x_1, ..., x_N} and seeks to discover latent structures, density distributions, or low-dimensional manifolds. Exemplified by K-Means clustering, Gaussian Mixture Models, and Principal Component Analysis (PCA).

3. Reinforcement Learning: An agent interacts with a stochastic environment through a Markov Decision Process (MDP), taking actions to maximize cumulative expected discounted reward over time.""",

    """2. Overfitting, Underfitting, and the Bias-Variance Tradeoff

The ultimate goal of supervised machine learning is out-of-sample generalization rather than mere training set memorization.

The expected generalization error of a predictive model decomposes mathematically into three distinct components:
E[(y - f_hat(x))^2] = Bias[f_hat(x)]^2 + Var[f_hat(x)] + sigma^2

Definitions:
- Bias: The systemic error introduced by approximating a complicated real-world function with a simplified model family. High bias results in underfitting.
- Variance: The sensitivity of the model to specific idiosyncratic fluctuations in the training dataset. High variance results in overfitting.
- Irreducible Error (sigma^2): The inherent noise in the data generating process that cannot be eliminated by any modeling technique.

Regularization Techniques to Prevent Overfitting:
- L2 Regularization (Ridge / Weight Decay): Penalizes large weights by adding (lambda/2) * ||w||_2^2 to the loss function, encouraging smooth, diffuse weights.
- L1 Regularization (Lasso): Adds lambda * ||w||_1 to the loss function, inducing sparsity by driving non-informative coefficients exactly to zero.
- Dropout: Randomly deactivates neurons during training with probability p, preventing co-adaptation of features.""",

    """3. Optimization via Gradient Descent

Most modern statistical learning algorithms minimize an empirical risk objective function J(theta) over parameter space theta in R^p:
J(theta) = (1/N) * sum_{i=1}^N L(f(x_i; theta), y_i)

Gradient Descent Variants:
1. Batch Gradient Descent: Computes the exact gradient nabla_theta J(theta) using the entire training dataset at each step:
   theta_{t+1} = theta_t - eta * nabla_theta J(theta_t)
   Guarantees convergence to global minimum for convex functions, but computationally prohibitive for large datasets.

2. Stochastic Gradient Descent (SGD): Computes an unbiased gradient estimate using a single randomly chosen training instance at each update step:
   theta_{t+1} = theta_t - eta * nabla_theta L(f(x_i; theta_t), y_i)

3. Mini-Batch Gradient Descent: Evaluates gradients across small batches of B samples (typically B in {32, 64, 128, 256}), achieving numerical stability through vectorized matrix operations on GPUs while retaining stochastic regularizing noise.""",

    """4. Deep Neural Networks and Backpropagation

Multilayer Perceptrons (MLPs) are universal function approximators composed of stacked affine transformations interleaved with nonlinear element-wise activation functions.

For layer l with weights W^(l) and bias b^(l):
z^(l) = W^(l) a^(l-1) + b^(l)
a^(l) = sigma(z^(l))

Common Activation Functions:
- Rectified Linear Unit (ReLU): f(z) = max(0, z). Mitigates the vanishing gradient problem in deep architectures.
- Leaky ReLU: f(z) = max(alpha * z, z) where alpha = 0.01, preventing dead neurons.
- Sigmoid: f(z) = 1 / (1 + exp(-z)). Maps activations to interval (0, 1), primarily utilized in binary classification output layers.

The Backpropagation algorithm computes partial derivatives partial L / partial W^(l) via recursive application of the multivariate chain rule from the final layer backward to the input layer.""",

    """5. Performance Evaluation Metrics for Academic Research

Evaluating statistical classifiers requires rigorous metrics beyond simple accuracy, particularly in datasets characterized by severe class imbalance.

Confusion Matrix Definitions:
- True Positives (TP): Correctly identified positive instances.
- False Positives (FP): Negative instances incorrectly classified as positive (Type I error).
- False Negatives (FN): Positive instances incorrectly classified as negative (Type II error).
- True Negatives (TN): Correctly identified negative instances.

Core Equations:
- Precision: TP / (TP + FP). Reflects the accuracy of positive predictions.
- Recall (Sensitivity): TP / (TP + FN). Reflects the model's ability to locate all actual positives.
- F1-Score: The harmonic mean of Precision and Recall:
  F1 = 2 * (Precision * Recall) / (Precision + Recall)
- Area Under the ROC Curve (AUC-ROC): Evaluates the true positive rate against the false positive rate across all discrimination thresholds."""
]

# Document 3: Institutional Faculty Policy (Faculty-only access scope)
faculty_pages = [
    """1. Institutional Research Integrity and Authorship Criteria

Faculty members at the institution must adhere strictly to established academic standards regarding research integrity, publication ethics, and intellectual property.

Authorship Standards:
Authorship credit must be based on substantial contributions according to the following four criteria:
1. Substantial contributions to the conception or design of the research work, or the acquisition, analysis, or interpretation of data.
2. Drafting the academic work or revising it critically for important intellectual content.
3. Final approval of the manuscript version to be published.
4. Agreement to be accountable for all aspects of the research in ensuring that questions related to the accuracy or integrity of any part are appropriately investigated and resolved.

Individuals who provide general supervision, departmental administrative support, or financial sponsorship do not qualify for co-authorship and must instead be recognized in the Acknowledgments section.""",

    """2. Conflict of Interest and External Consulting Regulations

Faculty are permitted to engage in professional consulting activities provided such engagements do not compromise their institutional responsibilities or create unmanaged conflicts of commitment.

Key Regulations:
- Time Allocation: External consulting activities must not exceed an average of one day per working week (maximum 20% of professional institutional commitment) during academic contract periods.
- Mandatory Disclosure: All faculty must submit an annual Financial Conflict of Interest (FCOI) disclosure form identifying any equity interests, consulting fees, or royalties exceeding $5,000 from commercial entities related to their academic research.
- Student Involvement: Faculty may not recruit graduate students or postdoctoral scholars to work on commercial consulting projects without prior written authorization from the Department Chair and Dean of Research.""",

    """3. Sabbatical Leave Eligibility and Application Procedures

The institution provides tenured faculty members with sabbatical leave opportunities to conduct uninterrupted scholarly research, author books, or develop advanced pedagogical curricula.

Eligibility Criteria:
- Tenured faculty members are eligible to apply for sabbatical leave after completing six consecutive academic years of full-time institutional service.
- Sabbatical leave may be taken as either:
  Option A: One full academic year at 75% of base institutional salary.
  Option B: One semester at 100% of base institutional salary.

Application Guidelines:
Applications must be submitted to the Sabbatical Review Committee at least nine months prior to the proposed leave commencement date. Applications must include an abstract, detailed research methodology, expected scholarly deliverables (e.g. peer-reviewed monographs or peer-reviewed journal papers), and a departmental instructional continuity plan."""
]

if __name__ == "__main__":
    create_pdf("Introduction_to_Quantum_Computing.pdf", "Introduction to Quantum Computing", quantum_pages)
    create_pdf("Machine_Learning_Fundamentals.pdf", "Machine Learning Fundamentals", ml_pages)
    create_pdf("Institutional_Faculty_Policy.pdf", "Institutional Faculty Policy", faculty_pages)
    print("All sample academic PDFs generated successfully!")
