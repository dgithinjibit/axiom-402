/**
 * Shared TypeScript types for axiom-402 Dev Portal.
 *
 * These mirror the Rust types in `reasoning-engine/src/types.rs` exactly —
 * keep them in sync when the Rust types change.
 */

// ── Spend request ─────────────────────────────────────────────────────────────

export interface SpendRequest {
  /** Amount in NEAR tokens (e.g. 2.5). */
  amount: number;
  /** Human-readable purpose string (e.g. "weather-data"). */
  purpose: string;
  /** Optional free-form metadata. */
  metadata?: Record<string, string>;
}

// ── Proof tree ────────────────────────────────────────────────────────────────

export interface ProofStep {
  /** The MeTTa atom or rule applied at this step. */
  atom: string;
  /** Child steps (premises) that led to this step. */
  premises: ProofStep[];
}

export interface ProofTree {
  /** Root conclusion atom. */
  conclusion: string;
  /** Full derivation trace from axioms to conclusion. */
  steps: ProofStep[];
  /** The spend request that was proved. */
  request: SpendRequest;
}

// ── Hashed proof ──────────────────────────────────────────────────────────────

export interface HashedProof {
  /** Canonical JSON of the ProofTree. */
  canonical_json: string;
  /** Lowercase hex SHA-256 hash of canonical_json (64 chars). */
  proof_hash: string;
  /** The proof tree itself. */
  tree: ProofTree;
}

// ── Anchor receipt ────────────────────────────────────────────────────────────

export interface AnchorReceipt {
  /** NEAR transaction hash (base58). */
  tx_hash: string;
  /** The proof hash that was anchored. */
  proof_hash: string;
  /** The policy CID that was anchored. */
  policy_cid: string;
}

// ── API request / response shapes ────────────────────────────────────────────

/** POST /api/derive — request body */
export interface DeriveRequest {
  /** Full MeTTa policy source code. */
  policy_source: string;
  /** The spend request to derive. */
  request: SpendRequest;
}

/** POST /api/derive — response body */
export type DeriveResponse =
  | { ok: true; proof: HashedProof }
  | { ok: false; error: string };

/** GET /api/verify?tx_hash=<hash> — response body */
export type VerifyResponse =
  | { ok: true; status: "VERIFIED" | "TAMPERED"; proof_hash: string; policy_cid: string }
  | { ok: false; error: string };

// ── React-Flow node / edge types ──────────────────────────────────────────────

export interface ProofNodeData {
  label: string;
  type: "axiom" | "rule" | "conclusion";
}
