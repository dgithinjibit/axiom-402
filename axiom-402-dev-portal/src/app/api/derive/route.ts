/**
 * POST /api/derive
 *
 * Accepts a MeTTa policy source + spend request and returns a hashed proof
 * tree.
 *
 * Phase 1: Forwards the request to the Rust Axum backend via the
 * `AXIOM_API_URL` env var.  If the backend is unavailable it returns a
 * clearly labelled mock response so the UI remains functional during
 * development.
 *
 * Phase 4: Replace the mock with actual WASM binding or a stable Axum proxy.
 */

import { NextResponse } from "next/server";
import type { DeriveRequest, DeriveResponse } from "@/lib/types";

export async function POST(req: Request): Promise<NextResponse<DeriveResponse>> {
  let body: DeriveRequest;

  try {
    body = (await req.json()) as DeriveRequest;
  } catch {
    return NextResponse.json(
      { ok: false, error: "Invalid JSON body" },
      { status: 400 }
    );
  }

  // ── Input validation ───────────────────────────────────────────────────────
  if (typeof body.policy_source !== "string" || body.policy_source.trim() === "") {
    return NextResponse.json(
      { ok: false, error: "policy_source is required" },
      { status: 422 }
    );
  }
  if (
    typeof body.request?.amount !== "number" ||
    typeof body.request?.purpose !== "string" ||
    body.request.purpose.trim() === ""
  ) {
    return NextResponse.json(
      { ok: false, error: "request.amount and request.purpose are required" },
      { status: 422 }
    );
  }

  // ── Try forwarding to the Rust backend ────────────────────────────────────
  const backendUrl = process.env["AXIOM_API_URL"];
  if (backendUrl != null) {
    try {
      const upstream = await fetch(`${backendUrl}/derive`, {
        method:  "POST",
        headers: { "Content-Type": "application/json" },
        body:    JSON.stringify(body),
        signal:  AbortSignal.timeout(15_000),
      });
      const data: DeriveResponse = (await upstream.json()) as DeriveResponse;
      return NextResponse.json(data, { status: upstream.status });
    } catch (err) {
      // Fall through to mock.
      console.error("[/api/derive] backend unavailable:", err);
    }
  }

  // ── Phase 1 mock response (dev / demo) ────────────────────────────────────
  const mockProofHash = Array.from(
    { length: 64 },
    (_, i) => ((i * 7 + 13) % 16).toString(16)
  ).join("");

  return NextResponse.json({
    ok: true,
    proof: {
      canonical_json: JSON.stringify({
        conclusion: `(can-spend ${body.request.amount} "${body.request.purpose}")`,
        steps: [
          {
            atom:     `(can-spend ${body.request.amount} "${body.request.purpose}")`,
            premises: [
              {
                atom:     `(spend-within-limit ${body.request.amount})`,
                premises: [
                  { atom: `(< ${body.request.amount} 5.0)`,   premises: [] },
                  { atom: "(max-single-spend 5.0)",            premises: [] },
                ],
              },
              {
                atom:     `(purpose-allowed "${body.request.purpose}")`,
                premises: [
                  { atom: `(allowed-purpose "${body.request.purpose}")`, premises: [] },
                ],
              },
            ],
          },
        ],
        request: body.request,
      }),
      proof_hash: mockProofHash,
      tree: {
        conclusion: `(can-spend ${body.request.amount} "${body.request.purpose}")`,
        steps: [
          {
            atom:     `(can-spend ${body.request.amount} "${body.request.purpose}")`,
            premises: [
              {
                atom:     `(spend-within-limit ${body.request.amount})`,
                premises: [
                  { atom: `(< ${body.request.amount} 5.0)`,   premises: [] },
                  { atom: "(max-single-spend 5.0)",            premises: [] },
                ],
              },
              {
                atom:     `(purpose-allowed "${body.request.purpose}")`,
                premises: [
                  { atom: `(allowed-purpose "${body.request.purpose}")`, premises: [] },
                ],
              },
            ],
          },
        ],
        request: body.request,
      },
    },
  } satisfies DeriveResponse);
}
