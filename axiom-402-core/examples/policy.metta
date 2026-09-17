;;; =============================================================================
;;; axiom-402 — Example Spending Policy (MeTTa / Hyperon)
;;; =============================================================================
;;;
;;; This file defines the baseline policy atoms for the axiom-402 reasoning
;;; engine.  Load it via `ReasoningEngine::load("examples/policy.metta")`.
;;;
;;; Structure:
;;;   1. Axioms     — ground facts (limits, allowlists)
;;;   2. Rules      — derivation rules that produce the `can-spend` conclusion
;;;   3. Tests      — inline test queries (run with `!(assertEqual …)`)
;;;
;;; Reference: https://github.com/trueagi-io/hyperon-experimental/blob/main/docs/minimal-metta.md
;;; =============================================================================


;; ── 1. Axioms ─────────────────────────────────────────────────────────────────

;; Maximum allowed spend per single transaction (NEAR tokens).
(max-single-spend 5.0)

;; Allowed spend purposes.  Add more as needed.
(allowed-purpose "weather-data")
(allowed-purpose "compute")
(allowed-purpose "storage")
(allowed-purpose "oracle-feed")

;; Minimum required confidence score for autonomous decisions (0.0–1.0).
(min-confidence 0.8)


;; ── 2. Derivation Rules ───────────────────────────────────────────────────────

;; can-spend : Amount × Purpose → Bool
;;
;; A spend is permitted if and only if:
;;   (a) the amount does not exceed the per-transaction limit, AND
;;   (b) the purpose is in the allowlist.
;;
;; This is the root query that `ReasoningEngine::derive_proof` runs:
;;   !(can-spend <amount> "<purpose>")
(= (can-spend $amount $purpose)
   (if (and
         (< $amount (max-single-spend))
         (allowed-purpose $purpose))
       True
       False))

;; spend-within-limit : Amount → Bool
;;
;; Helper rule exposed for step-level proof tracing.
(= (spend-within-limit $amount)
   (< $amount (max-single-spend)))

;; purpose-allowed : Purpose → Bool
;;
;; Helper rule exposed for step-level proof tracing.
(= (purpose-allowed $purpose)
   (allowed-purpose $purpose))


;; ── 3. Inline Tests ───────────────────────────────────────────────────────────

;; Permitted spend — amount 2.0, purpose "weather-data"
;; Expected: True
!(assertEqual
  (can-spend 2.0 "weather-data")
  True)

;; Rejected spend — amount exceeds limit
;; Expected: False
!(assertEqual
  (can-spend 10.0 "weather-data")
  False)

;; Rejected spend — purpose not in allowlist
;; Expected: False
!(assertEqual
  (can-spend 1.0 "gambling")
  False)

;; Boundary — exactly at the limit (5.0 is NOT < 5.0)
;; Expected: False
!(assertEqual
  (can-spend 5.0 "compute")
  False)

;; Permitted compute spend
;; Expected: True
!(assertEqual
  (can-spend 4.99 "compute")
  True)
