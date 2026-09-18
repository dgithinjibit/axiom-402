"use client";

/**
 * /verify — Verification Explorer
 *
 * Takes a NEAR transaction hash, fetches the proof_hash from the chain,
 * re-checks it against the on-chain attestation contract, and shows a
 * VERIFIED / TAMPERED badge.
 */

import { useState } from "react";
import { ExternalLink, Search } from "lucide-react";
import { VerifyBadge } from "@/components/VerifyBadge";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { getProofFromTransaction, verifyProofOnChain } from "@/lib/near";
import type { AnchorReceipt } from "@/lib/types";

type VerifyStatus = "idle" | "loading" | "verified" | "tampered" | "error";

// ── Component ─────────────────────────────────────────────────────────────────

export default function VerifyPage() {
  const [txHash, setTxHash]       = useState("");
  const [signerId, setSignerId]   = useState("");
  const [status, setStatus]       = useState<VerifyStatus>("idle");
  const [message, setMessage]     = useState<string | null>(null);
  const [receipt, setReceipt]     = useState<AnchorReceipt | null>(null);

  async function handleVerify() {
    const hash   = txHash.trim();
    const signer = signerId.trim();

    if (hash === "" || signer === "") return;

    setStatus("loading");
    setMessage(null);
    setReceipt(null);

    try {
      // Step 1: fetch the proof_hash that was passed to anchor_proof in this tx
      const txReceipt = await getProofFromTransaction(hash, signer);
      setReceipt(txReceipt);

      // Step 2: call verify_proof on the attestation contract
      const isOnChain = await verifyProofOnChain(txReceipt.proof_hash);

      if (isOnChain) {
        setStatus("verified");
        setMessage(
          `Proof hash ${txReceipt.proof_hash.slice(0, 12)}… is confirmed on NEAR testnet.`
        );
      } else {
        setStatus("tampered");
        setMessage(
          "The proof hash in this transaction was NOT found in the attestation contract. The proof may have been tampered with or the contract was redeployed."
        );
      }
    } catch (err) {
      setStatus("error");
      setMessage(err instanceof Error ? err.message : "Unknown error");
    }
  }

  const explorerBase = "https://testnet.nearblocks.io/txns";

  return (
    <div className="space-y-8">
      {/* Header */}
      <div className="space-y-1">
        <h1 className="text-3xl font-bold">Verification Explorer</h1>
        <p className="text-muted-foreground">
          Enter a NEAR transaction hash to confirm that its proof was legitimately
          derived and anchored on-chain.
        </p>
      </div>

      {/* Input form */}
      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="text-base">Transaction Details</CardTitle>
          <CardDescription>
            Both the transaction hash and the signer account ID are required by
            the NEAR RPC to look up the transaction.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          {/* TX Hash */}
          <div className="space-y-1.5">
            <label htmlFor="tx-hash" className="text-sm font-medium">
              Transaction Hash
            </label>
            <input
              id="tx-hash"
              type="text"
              value={txHash}
              onChange={(e) => setTxHash(e.target.value)}
              placeholder="e.g. 4xkR9G7…"
              className="flex h-9 w-full rounded-md border border-input bg-background px-3 py-1 font-mono text-sm shadow-sm transition-colors placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring"
              aria-required="true"
            />
          </div>

          {/* Signer */}
          <div className="space-y-1.5">
            <label htmlFor="signer-id" className="text-sm font-medium">
              Signer Account ID
            </label>
            <input
              id="signer-id"
              type="text"
              value={signerId}
              onChange={(e) => setSignerId(e.target.value)}
              placeholder="e.g. agent.testnet"
              className="flex h-9 w-full rounded-md border border-input bg-background px-3 py-1 text-sm shadow-sm transition-colors placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring"
              aria-required="true"
            />
          </div>

          <Button
            onClick={handleVerify}
            disabled={status === "loading" || txHash.trim() === "" || signerId.trim() === ""}
            className="w-full sm:w-auto"
          >
            <Search className="h-4 w-4" aria-hidden="true" />
            {status === "loading" ? "Verifying…" : "Verify Proof"}
          </Button>
        </CardContent>
      </Card>

      {/* Result badge */}
      {status !== "idle" && (
        <VerifyBadge
          status={status}
          message={message ?? undefined}
        />
      )}

      {/* Proof details */}
      {receipt != null && (
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-base">Anchored Proof Details</CardTitle>
          </CardHeader>
          <CardContent className="space-y-3 text-sm">
            <Row label="Transaction">
              <a
                href={`${explorerBase}/${receipt.tx_hash}`}
                target="_blank"
                rel="noopener noreferrer"
                className="flex items-center gap-1 font-mono text-xs text-primary hover:underline"
              >
                {receipt.tx_hash.slice(0, 20)}…
                <ExternalLink className="h-3 w-3" aria-hidden="true" />
              </a>
            </Row>
            <Row label="Proof Hash">
              <code className="rounded bg-muted px-1.5 py-0.5 font-mono text-xs">
                {receipt.proof_hash.slice(0, 16)}…{receipt.proof_hash.slice(-8)}
              </code>
            </Row>
            <Row label="Policy CID">
              <code className="rounded bg-muted px-1.5 py-0.5 font-mono text-xs">
                {receipt.policy_cid}
              </code>
            </Row>
            <Row label="Network">
              <Badge variant="outline" className="text-xs">NEAR Testnet</Badge>
            </Row>
          </CardContent>
        </Card>
      )}

      {/* How it works callout */}
      <Card className="border-dashed">
        <CardHeader className="pb-2">
          <CardTitle className="text-sm font-medium text-muted-foreground">
            How verification works
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-2 text-sm text-muted-foreground">
          <p>
            1. The NEAR RPC fetches the transaction and extracts the
            {" "}<code>proof_hash</code> passed to <code>anchor_proof</code>.
          </p>
          <p>
            2. The attestation contract's <code>verify_proof</code> view method
            is called — it returns <code>true</code> only if that exact hash was
            previously anchored.
          </p>
          <p>
            3. Because the proof hash is a SHA-256 of the canonical proof JSON,
            any tampering with the proof tree produces a different hash and
            fails verification.
          </p>
        </CardContent>
      </Card>
    </div>
  );
}

// ── Small layout helper ───────────────────────────────────────────────────────

function Row({
  label,
  children,
}: {
  label:    string;
  children: React.ReactNode;
}) {
  return (
    <div className="flex items-center justify-between gap-4 border-b border-border pb-2 last:border-0 last:pb-0">
      <span className="shrink-0 text-muted-foreground">{label}</span>
      <span className="text-right">{children}</span>
    </div>
  );
}
