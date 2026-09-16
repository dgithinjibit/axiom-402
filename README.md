# axiom-402

**Verifiable Economic Reasoning for Autonomous Agents.** 
*MeTTa for the why, Rust for the how, NEAR Intents for the settlement, On-chain for the proof.*

---

## Overview

**axiom-402** is a research prototype and hackathon project that enables autonomous agents to **prove *why* they spent money**, not just *that* they spent it. 

As AI agents become sovereign economic actors, a critical verification gap has emerged. Current infrastructure (like x402, Trust402, or ZK-compute) solves payment routing, identity authorization, and computation verification. However, none of them solve **Economic Policy Compliance**. An agent can prove it executed a script correctly, but it cannot prove that the script's decision to spend 500 USDC aligned with its declared treasury policy.

`axiom-402` fills this exact gap. It is the **chain-agnostic verifiable economic reasoning layer** that sits above payment protocols, generating cryptographic, re-derivable proofs of an agent's economic logic before a transaction is ever submitted.

## The Problem

When an autonomous agent spends funds, observers can verify the transaction hash on-chain. They **cannot** verify:
1. **The Policy:** Was the spend authorized under the agent's active mandate?
2. **The Logic:** Did the agent's internal reasoning correctly derive that this specific spend was optimal and compliant?
3. **The Integrity:** Was the policy silently altered or bypassed via prompt injection at the moment of execution?

Current agent treasury SDKs enforce spend caps via opaque code. Ledger-level verification is entirely retrospective. There is no mechanism to produce a verifiable record that a third party can check **without trusting the party that created it**.

## The Solution: The ASI + NEAR "Sweet Spot"

`axiom-402` solves this by making the agent's economic reasoning a verifiable artifact. We achieve this through a highly optimized, Rust-native pipeline leveraging the **ASI (Artificial Superintelligence Alliance)** ecosystem for reasoning and **NEAR Protocol** for settlement and attestation.

### The Three-Layer Architecture

**Layer 1 — Symbolic Policy Specification (ASI / MeTTa).**  
The agent's spending policy is written in MeTTa as a set of declarative facts and rules. MeTTa's symbolic nature ensures the policy is inspectable, type-guided, and logically sound.

**Layer 2 — Rust Execution & Proof Generation (The `axiom-402` Core).**  
When the agent decides to spend, the off-chain Rust runtime queries the MeTTa AtomSpace. It executes the derivation, producing a canonical **proof tree**. The runtime serializes this tree and computes its SHA-256 hash. *This is the cryptographic commitment to the agent's reasoning.*

**Layer 3 — Settlement & Attestation (NEAR Protocol).**  
The Rust runtime submits a transaction to a NEAR Smart Contract. This transaction contains the `proof_hash`, the `policy_cid` (IPFS reference to the MeTTa rules), and triggers a **NEAR Intent** for cross-chain settlement. The NEAR contract anchors the proof hash and uses **Chain Signatures** to execute the payment on the destination chain (e.g., Ethereum, Solana) without the agent needing to manage complex bridge logic.

## Architecture Flow

```text
[ Agent Goal: "Fetch premium weather data" ]
               │
               ▼
┌─────────────────────────────────────────────────────────┐
│  1. MEZZA REASONING (Off-Chain / ASI)                   │
│  • Query AtomSpace: Is budget sufficient?               │
│  • Query AtomSpace: Is purpose allowed?                 │
│  • Derive Proof Tree -> Serialize -> SHA-256 Hash       │
└───────────────────────┬─────────────────────────────────┘
                        │ proof_hash + policy_cid
                        ▼
┌─────────────────────────────────────────────────────────┐
│  2. NEAR SMART CONTRACT (On-Chain Attestation)          │
│  • Receives payload from Rust runtime.                  │
│  • Emits Event: ProofAnchored(agent_id, hash, cid).     │
│  • Triggers NEAR Intent Solver Network.                 │
└───────────────────────┬─────────────────────────────────┘
                        │ Intent Payload
                        ▼
┌─────────────────────────────────────────────────────────┐
│  3. NEAR INTENTS & CHAIN SIGNATURES (Settlement)        │
│  • Solver executes cross-chain payment (e.g., on ETH).  │
│  • Agent pays solver in NEAR/USDC.                      │
│  • Destination chain receives funds.                    │
└─────────────────────────────────────────────────────────┘
