"use client";

/**
 * /visualize — Proof Visualizer
 *
 * Renders a ProofTree as an interactive node-graph.
 * Accepts the tree via:
 *   - ?proof=<base64(JSON)>  — from the playground
 *   - Manual JSON paste in the editor
 */

import { useState, useEffect } from "react";
import { useSearchParams } from "next/navigation";
import Link from "next/link";
import { ProofGraph } from "@/components/ProofGraph";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import type { ProofTree } from "@/lib/types";
import { ArrowLeft } from "lucide-react";

// ── Sample tree shown when nothing is passed via URL ─────────────────────────

const SAMPLE_TREE: ProofTree = {
  conclusion: '(can-spend 2.0 "weather-data")',
  steps: [
    {
      atom: '(can-spend 2.0 "weather-data")',
      premises: [
        {
          atom: "(spend-within-limit 2.0)",
          premises: [
            { atom: "(< 2.0 5.0)",         premises: [] },
            { atom: "(max-single-spend 5.0)", premises: [] },
          ],
        },
        {
          atom: '(purpose-allowed "weather-data")',
          premises: [
            { atom: '(allowed-purpose "weather-data")', premises: [] },
          ],
        },
      ],
    },
  ],
  request: { amount: 2.0, purpose: "weather-data" },
};

// ── Component ─────────────────────────────────────────────────────────────────

export default function VisualizePage() {
  const searchParams = useSearchParams();
  const [tree, setTree]         = useState<ProofTree | null>(null);
  const [jsonInput, setJsonInput] = useState("");
  const [parseError, setParseError] = useState<string | null>(null);
  const [usingSample, setUsingSample] = useState(false);

  // On mount: try to decode ?proof= param from playground
  useEffect(() => {
    const encoded = searchParams.get("proof");
    if (encoded != null) {
      try {
        const decoded = JSON.parse(atob(encoded)) as ProofTree;
        setTree(decoded);
        setJsonInput(JSON.stringify(decoded, null, 2));
      } catch {
        setParseError("Failed to decode proof from URL.");
      }
    }
  }, [searchParams]);

  function loadSample() {
    setTree(SAMPLE_TREE);
    setJsonInput(JSON.stringify(SAMPLE_TREE, null, 2));
    setParseError(null);
    setUsingSample(true);
  }

  function handleParse() {
    setParseError(null);
    setUsingSample(false);
    try {
      const parsed = JSON.parse(jsonInput) as ProofTree;
      setTree(parsed);
    } catch (err) {
      setParseError(err instanceof Error ? err.message : "Invalid JSON");
    }
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-start justify-between gap-4">
        <div className="space-y-1">
          <h1 className="text-3xl font-bold">Proof Visualizer</h1>
          <p className="text-muted-foreground">
            Explore the derivation trace as an interactive node graph — from
            axioms up to the final conclusion.
          </p>
        </div>
        <Button asChild variant="outline" size="sm">
          <Link href="/playground">
            <ArrowLeft className="h-3.5 w-3.5" aria-hidden="true" />
            Playground
          </Link>
        </Button>
      </div>

      {/* Legend */}
      <div className="flex flex-wrap gap-3 text-sm">
        {[
          { color: "bg-green-400",  label: "Conclusion — the root spend decision" },
          { color: "bg-purple-400", label: "Rule — derivation step"               },
          { color: "bg-blue-400",   label: "Axiom — ground fact from policy"      },
        ].map(({ color, label }) => (
          <div key={label} className="flex items-center gap-1.5 text-muted-foreground">
            <span className={`h-2.5 w-2.5 rounded-full ${color}`} aria-hidden="true" />
            {label}
          </div>
        ))}
      </div>

      {/* Graph */}
      {tree != null ? (
        <div className="space-y-3">
          {usingSample && (
            <Badge variant="secondary" className="text-xs">
              Showing sample proof — paste your own JSON below
            </Badge>
          )}
          <ProofGraph tree={tree} />
        </div>
      ) : (
        <div className="flex h-60 items-center justify-center rounded-lg border border-dashed bg-muted/30 text-muted-foreground">
          <div className="text-center space-y-2">
            <p className="text-sm">No proof tree loaded.</p>
            <Button size="sm" variant="outline" onClick={loadSample}>
              Load sample
            </Button>
          </div>
        </div>
      )}

      {/* JSON input */}
      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="text-base">Paste Proof JSON</CardTitle>
          <CardDescription>
            Paste a <code>ProofTree</code> JSON object to visualize it, or{" "}
            <button
              onClick={loadSample}
              className="text-primary underline-offset-2 hover:underline"
            >
              load the sample
            </button>
            .
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-3">
          <textarea
            value={jsonInput}
            onChange={(e) => setJsonInput(e.target.value)}
            rows={8}
            spellCheck={false}
            className="w-full rounded-md border border-input bg-background p-3 font-mono text-xs shadow-sm transition-colors placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring resize-y"
            placeholder='{ "conclusion": "(can-spend 2.0 …)", "steps": […], "request": {…} }'
            aria-label="Proof tree JSON"
          />
          {parseError != null && (
            <p className="text-xs text-destructive" role="alert">{parseError}</p>
          )}
          <Button onClick={handleParse} disabled={jsonInput.trim() === ""}>
            Render Graph
          </Button>
        </CardContent>
      </Card>
    </div>
  );
}
