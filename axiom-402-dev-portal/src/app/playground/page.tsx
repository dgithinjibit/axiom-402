"use client";

/**
 * /playground — Policy Playground
 *
 * Lets developers paste a MeTTa policy, set a spend request,
 * and click "Derive Proof" to see the proof tree + hash.
 */

import { useState } from "react";
import Link from "next/link";
import { ArrowRight, Loader2, Copy, Check } from "lucide-react";
import { PolicyEditor } from "@/components/PolicyEditor";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import type { DeriveRequest, DeriveResponse, HashedProof } from "@/lib/types";

// ── Default policy shown on first load ───────────────────────────────────────

const DEFAULT_POLICY = `; axiom-402 — example spending policy
(max-single-spend 5.0)

(allowed-purpose "weather-data")
(allowed-purpose "compute")
(allowed-purpose "storage")
(allowed-purpose "oracle-feed")

(= (can-spend $amount $purpose)
   (if (and
         (< $amount (max-single-spend))
         (allowed-purpose $purpose))
       True
       False))

(= (spend-within-limit $amount)
   (< $amount (max-single-spend)))

(= (purpose-allowed $purpose)
   (allowed-purpose $purpose))`;

// ── Component ─────────────────────────────────────────────────────────────────

export default function PlaygroundPage() {
  const [policy, setPolicy]   = useState(DEFAULT_POLICY);
  const [amount, setAmount]   = useState("2.0");
  const [purpose, setPurpose] = useState("weather-data");
  const [loading, setLoading] = useState(false);
  const [error, setError]     = useState<string | null>(null);
  const [proof, setProof]     = useState<HashedProof | null>(null);
  const [copied, setCopied]   = useState(false);

  async function handleDerive() {
    setLoading(true);
    setError(null);
    setProof(null);

    const body: DeriveRequest = {
      policy_source: policy,
      request: {
        amount:  parseFloat(amount),
        purpose: purpose.trim(),
      },
    };

    try {
      const res  = await fetch("/api/derive", {
        method:  "POST",
        headers: { "Content-Type": "application/json" },
        body:    JSON.stringify(body),
      });
      const data: DeriveResponse = await res.json() as DeriveResponse;

      if (!data.ok) {
        setError(data.error);
      } else {
        setProof(data.proof);
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : "Network error");
    } finally {
      setLoading(false);
    }
  }

  async function handleCopy() {
    if (proof == null) return;
    await navigator.clipboard.writeText(proof.proof_hash);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  }

  return (
    <div className="space-y-8">
      {/* Header */}
      <div className="space-y-1">
        <h1 className="text-3xl font-bold">Policy Playground</h1>
        <p className="text-muted-foreground">
          Paste your MeTTa policy, set a spend request, and derive a verifiable proof.
        </p>
      </div>

      <div className="grid gap-6 lg:grid-cols-2">
        {/* Left — Policy editor */}
        <div className="space-y-3">
          <label className="text-sm font-medium" htmlFor="policy-editor">
            Policy source <span className="font-mono text-xs text-muted-foreground">(.metta)</span>
          </label>
          <PolicyEditor
            value={policy}
            onChange={setPolicy}
            minHeight="360px"
          />
        </div>

        {/* Right — Spend request + result */}
        <div className="space-y-4">
          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="text-base">Spend Request</CardTitle>
              <CardDescription>
                The agent wants to spend this amount for this purpose.
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              {/* Amount */}
              <div className="space-y-1.5">
                <label htmlFor="amount" className="text-sm font-medium">
                  Amount <span className="text-muted-foreground">(NEAR)</span>
                </label>
                <input
                  id="amount"
                  type="number"
                  min="0"
                  step="0.1"
                  value={amount}
                  onChange={(e) => setAmount(e.target.value)}
                  className="flex h-9 w-full rounded-md border border-input bg-background px-3 py-1 text-sm shadow-sm transition-colors placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring disabled:cursor-not-allowed disabled:opacity-50"
                  aria-describedby="amount-hint"
                />
                <p id="amount-hint" className="text-xs text-muted-foreground">
                  Policy max is 5.0 NEAR.
                </p>
              </div>

              {/* Purpose */}
              <div className="space-y-1.5">
                <label htmlFor="purpose" className="text-sm font-medium">
                  Purpose
                </label>
                <input
                  id="purpose"
                  type="text"
                  value={purpose}
                  onChange={(e) => setPurpose(e.target.value)}
                  placeholder="e.g. weather-data"
                  className="flex h-9 w-full rounded-md border border-input bg-background px-3 py-1 text-sm shadow-sm transition-colors placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring disabled:cursor-not-allowed disabled:opacity-50"
                />
              </div>

              <Button
                onClick={handleDerive}
                disabled={loading || policy.trim() === "" || purpose.trim() === ""}
                className="w-full"
              >
                {loading ? (
                  <>
                    <Loader2 className="h-4 w-4 animate-spin" aria-hidden="true" />
                    Deriving proof…
                  </>
                ) : (
                  "Derive Proof"
                )}
              </Button>
            </CardContent>
          </Card>

          {/* Error */}
          {error != null && (
            <Card className="border-destructive/50 bg-destructive/5">
              <CardContent className="p-4">
                <p className="text-sm font-medium text-destructive">
                  Derivation failed
                </p>
                <p className="mt-1 font-mono text-xs text-destructive/80">{error}</p>
              </CardContent>
            </Card>
          )}

          {/* Proof result */}
          {proof != null && (
            <Card className="border-green-300 bg-green-50 dark:border-green-700 dark:bg-green-950">
              <CardHeader className="pb-2">
                <div className="flex items-center justify-between">
                  <CardTitle className="text-base text-green-800 dark:text-green-200">
                    Proof Derived ✓
                  </CardTitle>
                  <Badge variant="success">SHA-256</Badge>
                </div>
              </CardHeader>
              <CardContent className="space-y-3">
                <div>
                  <p className="mb-1 text-xs font-medium text-muted-foreground">Proof Hash</p>
                  <div className="flex items-center gap-2">
                    <code className="flex-1 truncate rounded bg-white/60 px-2 py-1 font-mono text-xs dark:bg-black/20">
                      {proof.proof_hash}
                    </code>
                    <Button
                      variant="ghost"
                      size="icon"
                      onClick={handleCopy}
                      aria-label="Copy proof hash"
                      className="h-7 w-7 shrink-0"
                    >
                      {copied
                        ? <Check className="h-3.5 w-3.5 text-green-600" aria-hidden="true" />
                        : <Copy className="h-3.5 w-3.5" aria-hidden="true" />}
                    </Button>
                  </div>
                </div>
                <div className="flex gap-2">
                  <Button asChild size="sm" variant="outline" className="flex-1">
                    <Link
                      href={{
                        pathname: "/visualize",
                        query:    { proof: btoa(JSON.stringify(proof.tree)) },
                      }}
                    >
                      Visualize <ArrowRight className="h-3.5 w-3.5" aria-hidden="true" />
                    </Link>
                  </Button>
                </div>
              </CardContent>
            </Card>
          )}
        </div>
      </div>
    </div>
  );
}
