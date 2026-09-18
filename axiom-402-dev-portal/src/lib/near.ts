/**
 * NEAR Protocol helpers for the axiom-402 Dev Portal.
 *
 * Provides read-only calls to the NEAR JSON-RPC API for the Verification
 * Explorer page.  No signing is performed in the browser.
 */

import type { AnchorReceipt } from "@/lib/types";

const RPC_URL =
  process.env["NEXT_PUBLIC_NEAR_RPC_URL"] ?? "https://rpc.testnet.near.org";

const CONTRACT_ID =
  process.env["NEXT_PUBLIC_CONTRACT_ID"] ?? "attestation.testnet";

// ── JSON-RPC helper ───────────────────────────────────────────────────────────

interface RpcError {
  code: number;
  message: string;
}

interface RpcEnvelope<T> {
  result?: T;
  error?: RpcError;
}

async function rpcCall<T>(method: string, params: unknown): Promise<T> {
  const res = await fetch(RPC_URL, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      jsonrpc: "2.0",
      id: "axiom-portal",
      method,
      params,
    }),
  });

  if (!res.ok) {
    throw new Error(`HTTP ${res.status}: ${res.statusText}`);
  }

  const json: RpcEnvelope<T> = (await res.json()) as RpcEnvelope<T>;

  if (json.error != null) {
    throw new Error(`NEAR RPC error (${json.error.code}): ${json.error.message}`);
  }

  if (json.result == null) {
    throw new Error("NEAR RPC: empty result");
  }

  return json.result;
}

// ── View-call helper ──────────────────────────────────────────────────────────

interface ViewCallResult {
  result: number[];
  logs: string[];
}

/**
 * Call a read-only view method on the attestation contract.
 */
async function viewCall<T>(methodName: string, args: object): Promise<T> {
  const argsBase64 = btoa(JSON.stringify(args));

  const result = await rpcCall<ViewCallResult>("query", {
    request_type: "call_function",
    finality: "final",
    account_id: CONTRACT_ID,
    method_name: methodName,
    args_base64: argsBase64,
  });

  const decoded = new TextDecoder().decode(new Uint8Array(result.result));
  return JSON.parse(decoded) as T;
}

// ── Public API ────────────────────────────────────────────────────────────────

/**
 * Look up the proof anchored in a given NEAR transaction.
 *
 * Fetches the transaction receipt, extracts the `anchor_proof` call args,
 * and returns an `AnchorReceipt`.
 *
 * @throws if the transaction is not found or is not an `anchor_proof` call.
 */
export async function getProofFromTransaction(
  txHash: string,
  signerId: string
): Promise<AnchorReceipt> {
  interface TxStatus {
    transaction: {
      actions: Array<{
        FunctionCall?: {
          method_name: string;
          args: string;
        };
      }>;
    };
  }

  const tx = await rpcCall<TxStatus>("tx", [txHash, signerId]);

  const action = tx.transaction.actions
    .map((a) => a.FunctionCall)
    .find((fn) => fn?.method_name === "anchor_proof");

  if (action == null) {
    throw new Error("Transaction does not contain an anchor_proof call");
  }

  const decoded = JSON.parse(atob(action.args)) as {
    proof_hash: string;
    policy_cid: string;
  };

  return {
    tx_hash: txHash,
    proof_hash: decoded.proof_hash,
    policy_cid: decoded.policy_cid,
  };
}

/**
 * Verify that a proof hash exists on-chain by calling `verify_proof` on the
 * attestation contract.
 */
export async function verifyProofOnChain(proofHash: string): Promise<boolean> {
  return viewCall<boolean>("verify_proof", { proof_hash: proofHash });
}
