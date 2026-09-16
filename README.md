# axiom-402

**Verifiable economic reasoning for autonomous agents. MeTTa for the *why*, Rust for the *how*, x402 for the *payment*, NEAR for the *proof*.**

---

## Overview

axiom-402 is a chain-agnostic verifiable reasoning layer for autonomous agents. It enables an agent to prove **why** it spent money, not merely **that** it spent it.

Every spending decision is expressed as a declarative rule in MeTTa, derived symbolically over an AtomSpace, serialized as a proof tree in Rust, and anchored on-chain alongside the payment. Any third party can later reconstruct the policy, re-run the derivation, and confirm that the agent's decision followed from its declared rules — without trusting the agent, the operator, or the infrastructure.

The system unifies four previously separate concerns:

- **Symbolic policy** — spending rules defined in MeTTa over an AtomSpace.
- **Execution runtime** — Rust evaluates rules, generates proof trees, performs x402 handshakes.
- **Settlement** — NEAR smart contracts anchor proofs; NEAR Intents and Chain Signatures route payments across chains.
- **Verification** — independent re-derivation of the proof from the published policy.

axiom-402 is not a payment protocol, an identity system, or a ZK circuit. It is the auditable reasoning layer that sits above them.

---

## The Problem

Autonomous agents are becoming economic actors. They pay for APIs, provision compute, manage treasuries, and settle with one another. But their economic reasoning is opaque.

When an agent spends 5 USDC, an observer can verify the transaction occurred. The observer cannot verify **why** the agent chose that counterparty, at that moment, at that price, under which policy version. The agent's code may contain hardcoded exceptions. The policy may have been altered silently. The decision may violate the mandate the agent was given.

Existing approaches each carry the same structural defect:

- **Agent-level enforcement** — the party enforcing the constraint is the party being constrained. Prompt injection and code modification remain viable attack vectors.
- **Card-level spend controls** — reveal an amount and a merchant category, but not the agent's policy or the version under which the decision was made.
- **Ledger-level verification** — authoritative but entirely retrospective. It records what happened, never whether it *should have* happened under the applicable rules.
- **Proof-of-authorization systems** — prove an agent was permitted to spend, not that its specific decision followed from policy.
- **Proof-of-computation systems** — prove a model ran correctly, not that its output conformed to economic policy.

None produces a verifiable record that a third party can check without trusting the party that created it.

---

## The Solution

axiom-402 makes the agent's economic reasoning itself a verifiable artifact.

When the agent decides to spend, the Rust runtime:

1. Queries the MeTTa AtomSpace for applicable rules.
2. Executes the derivation, producing a proof tree whose leaves are policy axioms and whose root is the concluded action.
3. Serializes the tree canonically and computes its SHA-256 hash.
4. Performs the x402 payment handshake.
5. Anchors the proof hash on-chain alongside the payment.
6. Updates the off-chain budget accumulator; any unspent remainder is refunded on-chain.

Any third party can retrieve the proof hash, reconstruct the MeTTa policy, re-run the derivation, and verify the decision. The proof reveals the **logic** of the decision without necessarily revealing the private content of the agent's strategy.

### Minimal Policy Example

```metta
;; An agent may spend on a purpose if budget remains,
;; the amount is within the single-spend ceiling,
;; and the purpose matches an active goal.
(= (can-spend ?agent ?amount ?purpose)
   (and (>= (remaining-budget ?agent) ?amount)
        (<= ?amount (max-single-spend ?agent))
        (priority-match ?purpose (current-goals ?agent))))

;; Invariant: a minimum reserve must remain after any spend.
(= (invariant-satisfied ?agent ?amount)
   (>= (- (remaining-budget ?agent) ?amount)
       (minimum-reserve ?agent)))
```

The runtime queries this policy, derives whether `(can-spend agent-001 2.00 market-data)` holds, and emits the corresponding proof tree.

---

## Architecture

```
┌─────────────────────────────────────────────────────────────────────┐
│                     OmegaClaw Control Loop                           │
│          Continual execution, AIKR-bounded, MeTTa core               │
│                                                                      │
│  ┌────────────────────────────────────────────────────────────────┐  │
│  │  MeTTa Policy Layer (AtomSpace)                                │  │
│  │  Spending rules · Goal priorities · Budget invariants          │  │
│  │  NAL / PLN uncertainty reasoning                               │  │
│  └───────────────────────────┬────────────────────────────────────┘  │
│                              │ derivation query                      │
│                              ▼                                       │
│  ┌────────────────────────────────────────────────────────────────┐  │
│  │  Rust Execution Runtime                                        │  │
│  │  MeTTa interpreter (MORK kernel)                               │  │
│  │  Proof tree serialization and SHA-256 hashing                  │  │
│  │  x402 payment handshake                                        │  │
│  │  NEAR SDK: contract calls, intent construction, signatures     │  │
│  └───────────────────────────┬────────────────────────────────────┘  │
│                              │ payment + proof hash                  │
│                              ▼                                       │
│  ┌────────────────────────────────────────────────────────────────┐  │
│  │  NEAR Settlement Layer                                         │  │
│  │  Proof anchoring to NEAR contract state                        │  │
│  │  Intent-based cross-chain settlement                           │  │
│  │  Chain Signatures for multi-chain asset control                │  │
│  │  Unspent remainder refunded on-chain                           │  │
│  └────────────────────────────────────────────────────────────────┘  │
└─────────────────────────────────────────────────────────────────────┘
```

### Data Flow for a Single Spend Decision

1. **Goal activation.** OmegaClaw's control loop identifies a goal requiring an external resource.
2. **Policy query.** The Rust runtime queries the AtomSpace for rules permitting spend on this purpose.
3. **Derivation.** MeTTa resolves the query, producing a proof tree from policy axioms to conclusion.
4. **Proof serialization.** The Rust layer serializes the tree canonically and computes its SHA-256 hash.
5. **Payment execution.** The runtime performs the x402 handshake and constructs the settlement instruction.
6. **Proof anchoring.** The hash is written to a NEAR contract. The result is immutable and independently verifiable.
7. **Budget update.** The accumulator is updated; unspent funds return on-chain.

---

## Why ASI + NEAR

Multiple settlement layers were evaluated, including Hedera, ZetaChain, and Cairo-based systems. NEAR was selected as the optimal partner for ASI-based agents for three reasons.

**The Rust-to-Rust pipeline.** ASI's MeTTa engine and NEAR's smart contracts are both natively Rust. This removes the engineering overhead and security surface of FFI boundaries or Solidity–Rust ABI encoding. Proof generation and contract interaction share a memory model and type system.

**Intents are agent-native.** NEAR Intents let agents declare *what* they want to achieve — "pay 5 USDC on Ethereum" — rather than *how*. This maps directly onto MeTTa's logical conclusions, allowing the reasoning layer to drive the settlement layer declaratively. One integration reaches more than thirty chains.

**Chain abstraction via signatures.** NEAR Chain Signatures allow a single NEAR identity to control assets on EVM and non-EVM chains through Multi-Party Computation. axiom-402 does not build custom bridges; it relies on NEAR's native cryptographic orchestration.

### Relationship to Other Chains

The proof layer is chain-agnostic. Only the settlement adapter is chain-specific.

| Adapter | Chain | Payment Mechanism | Proof Anchoring |
|---|---|---|---|
| `NearAdapter` | NEAR | NEP-366 SignedDelegate, NEP-141 transfer | NEAR contract state |
| `HederaAdapter` | Hedera | HTS transfer, facilitator-sponsored | HCS topic message |
| `EvmAdapter` | Any EVM | EIP-3009 / Permit2 | Event log |
| `ZetaAdapter` | ZetaChain | Cross-Chain Transaction (atomic) | Universal EVM state |
| `AsiChainAdapter` | ASI:Chain | MeTTa smart contract | On-chain Space operation |

A new chain requires three methods: `execute_payment`, `anchor_proof`, and `refund_remainder`. The MeTTa derivation, proof serialization, and hashing logic remain unchanged.

**Complementarity with other verification systems.** ZK-based compute proofs (Cairo, Giza LuminAIR) verify that a computation ran correctly. axiom-402 verifies that the computation's economic output conformed to policy. The two are orthogonal and composable: correct computation producing policy-compliant decisions.

---

## Why This Is Novel

The intersection of MeTTa, agent payments, and on-chain verification is not empty, but the specific position axiom-402 occupies is unoccupied.

| System | What It Provides | What It Does Not Provide |
|---|---|---|
| SOLPRISM | On-chain commitment of reasoning trace hashes | No symbolic derivation; no policy compliance proof |
| ASI:Chain | MeTTa as an on-chain contract language | No economic policy verification layer |
| OmegaClaw | Bounded agentic loop with AIKR and uncertainty reasoning | No economic module; no payment integration |
| Trust402 | ZK proofs of role membership and spend limits | Proof of authorization, not of reasoning |
| AEVS | Cryptographic receipts for agent actions | Verifies that an action occurred, not why |
| Proof-of-Spend | Payment logs as reputation primitives | Reputation layer, not a policy derivation |
| Agent treasury SDKs | Enforcement of spending caps via hooks | Policy is opaque; no re-derivable proof |

axiom-402 is the first architecture to unify symbolic economic policy, verifiable proof generation, machine-native payments, and on-chain attestation in a single loop, with a **re-derivable symbolic proof** as the output artifact.

---

## Technology Stack

| Component | Technology | Role |
|---|---|---|
| Cognitive architecture | OmegaClaw / MeTTa | Symbolic policy specification and logical derivation |
| Uncertainty reasoning | NAL / PLN | Probabilistic cost estimation, risk-aware spending |
| Execution runtime | Rust | MeTTa interpretation, proof serialization, hashing |
| MeTTa kernel | MORK | High-performance pattern matching over the AtomSpace |
| Payment protocol | x402 (HTTP 402) | Stateless, per-request payment negotiation |
| Settlement and attestation | NEAR Protocol | Smart contract for proof anchoring and intent execution |
| Cross-chain execution | NEAR Intents, Chain Signatures | Solver-based settlement, multi-chain asset control |
| Decentralized storage | IPFS / Arweave | Full policy and proof tree storage |

---

## Getting Started

### Prerequisites

- Rust (latest stable, 2021 edition or later)
- NEAR CLI (`near-cli-rs`)
- MeTTa / Hyperon (via the `hyperon` Rust crate)
- A funded NEAR Testnet account

### Installation

Clone the repository:

```bash
git clone https://github.com/your-org/axiom-402.git
cd axiom-402
```

Build the Rust workspace:

```bash
cargo build --release
```

Run the local policy derivation demo:

```bash
cargo run --release --bin demo-derive -- --policy examples/minimal.metta --amount 2.00 --purpose market-data
```

Output: a serialized proof tree and its SHA-256 hash.

Deploy the NEAR attestation contract:

```bash
near deploy --accountId axiom402.testnet --wasmFile target/near/axiom402.wasm
```

### Configuration

```bash
cp .env.example .env
# NEAR_ACCOUNT_ID=axiom402.testnet
# NEAR_PRIVATE_KEY=...
# X402_FACILITATOR_URL=https://...
# PROOF_STORAGE=ipfs
```

### Verifying a Proof

```bash
cargo run --release --bin axiom-verify -- \
  --policy examples/minimal.metta \
  --proof-hash 0x... \
  --payment-tx 0x...
```

The verifier reconstructs the policy, re-runs the derivation, and confirms the anchored hash matches.

---

## Roadmap

| Phase | Target | Description |
|---|---|---|
| M0 | Q4 2026 | MeTTa grammar for spending policies; derivation engine in Rust |
| M1 | Q1 2027 | Canonical proof serialization; SHA-256 hashing; local verification tool |
| M2 | Q2 2027 | NEAR attestation contract; proof anchoring; testnet deployment |
| M3 | Q3 2027 | NEAR Intents integration; cross-chain settlement experiments |
| M4 | Q4 2027 | Independent verifier CLI; third-party re-derivation tooling |
| M5 | Q1 2028 | Formal semantics of MeTTa spending policies; empirical evaluation |
| M6 | Q2 2028 | ASI:Chain native deployment; on-chain proof re-derivation |

---

## Research Questions

1. **Expressiveness versus verifiability.** What class of spending policies can be expressed in MeTTa such that derivations remain compact enough to anchor on-chain and simple enough to re-derive in bounded time?
2. **Soundness under bounded resources.** How does the AIKR constraint affect completeness of proof generation when an agent must act before a full derivation is available?
3. **Incentive compatibility.** Does proof anchoring create perverse incentives, such as agents optimizing for proof simplicity rather than decision quality?
4. **Privacy versus auditability.** To what extent can a proof reveal the logic of a decision while concealing the content of private strategy?

---

## Contributing

Contributions are welcome in the following areas:

- **MeTTa policy design** — expanding the expressiveness of spending rules while preserving proof compactness.
- **Proof serialization** — canonical encodings that minimize on-chain payload size while remaining re-derivable.
- **NEAR contract logic** — intent routing and proof verification mechanisms.
- **Settlement adapters** — support for additional chains and facilitators.
- **Formal semantics** — theoretical foundations of symbolic economic reasoning.

Open an issue before submitting a pull request for substantive changes. Correctness of derivations and soundness of proofs take precedence over implementation convenience.

---

## References

1. Botnick, M., Hammer, P., Isaev, P., Goertzel, B., Crawford, K. (2026). *OmegaClaw: A Continually Operating Agentic Architecture Under Bounded Resources.* Artificial General Intelligence.
2. Goertzel, B., et al. (2023). *OpenCog Hyperon: A Framework for AGI at the Human Level and Beyond.* arXiv:2310.18318.
3. NEAR Protocol. *Chain Signatures and Intents Documentation.*
4. Hedera. *Pay with x402 on Hedera.* Hedera Documentation.
5. NeukoAI. *SOLPRISM — Verifiable AI Reasoning on Solana.*
6. SingularityNET. *OmegaClaw.*
7. MDPI. (2026). *Computational Jurisprudence: Verifiable Law for Machine Societies.* Future Internet.

---

## License

Licensed under the Apache License 2.0. See the `LICENSE` file for details. The license permits academic and commercial use, modification, and distribution, provided the original copyright notice and attribution are preserved.

---

*axiom-402 is an independent research effort at the intersection of symbolic AI and Web3 economics. It is not affiliated with SingularityNET, NEAR Protocol, or the x402 project, though it builds on their open-source foundations.*
