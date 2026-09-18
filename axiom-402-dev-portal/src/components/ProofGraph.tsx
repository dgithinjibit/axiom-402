"use client";

/**
 * ProofGraph
 *
 * Renders a ProofTree as an interactive node-graph using @xyflow/react.
 * Each ProofStep becomes a node; edges flow from premise → conclusion.
 */

import { useCallback, useMemo } from "react";
import {
  ReactFlow,
  Background,
  Controls,
  MiniMap,
  type Node,
  type Edge,
  useNodesState,
  useEdgesState,
  BackgroundVariant,
  Panel,
} from "@xyflow/react";
import "@xyflow/react/dist/style.css";
import type { ProofTree, ProofStep, ProofNodeData } from "@/lib/types";
import { cn } from "@/lib/utils";

// ── Node colours by type ──────────────────────────────────────────────────────

const NODE_STYLES: Record<ProofNodeData["type"], string> = {
  axiom:      "bg-blue-50   border-blue-300  text-blue-900",
  rule:       "bg-purple-50 border-purple-300 text-purple-900",
  conclusion: "bg-green-50  border-green-400  text-green-900 font-semibold",
};

// ── Graph builder ─────────────────────────────────────────────────────────────

let idCounter = 0;

function buildGraph(
  steps: ProofStep[],
  parentId: string | null,
  nodes: Node<ProofNodeData>[],
  edges: Edge[],
  depth: number
): void {
  for (const step of steps) {
    const id = `node-${++idCounter}`;
    const type: ProofNodeData["type"] =
      depth === 0 ? "conclusion"
      : step.premises.length === 0 ? "axiom"
      : "rule";

    nodes.push({
      id,
      type: "default",
      position: { x: (idCounter % 5) * 220, y: depth * 120 },
      data: { label: step.atom, type },
      style: {
        borderRadius: "0.5rem",
        padding: "8px 12px",
        fontSize: "0.75rem",
        maxWidth: "200px",
        wordBreak: "break-word",
      },
    });

    if (parentId != null) {
      edges.push({
        id:     `edge-${parentId}-${id}`,
        source: id,
        target: parentId,
        animated: true,
        style:  { stroke: "#9ca3af" },
      });
    }

    buildGraph(step.premises, id, nodes, edges, depth + 1);
  }
}

// ── Component ─────────────────────────────────────────────────────────────────

interface ProofGraphProps {
  tree:      ProofTree;
  className?: string;
}

export function ProofGraph({ tree, className }: ProofGraphProps) {
  idCounter = 0;

  const { initialNodes, initialEdges } = useMemo(() => {
    const nodes: Node<ProofNodeData>[] = [];
    const edges: Edge[] = [];

    // Root conclusion node
    const rootId = "node-root";
    nodes.push({
      id:   rootId,
      type: "default",
      position: { x: 300, y: 0 },
      data: { label: tree.conclusion, type: "conclusion" },
      style: {
        borderRadius: "0.5rem",
        padding:      "8px 16px",
        fontSize:     "0.8rem",
        fontWeight:   "600",
        background:   "#f0fdf4",
        border:       "2px solid #4ade80",
      },
    });

    buildGraph(tree.steps, rootId, nodes, edges, 1);

    return { initialNodes: nodes, initialEdges: edges };
  }, [tree]);

  const [nodes, , onNodesChange] = useNodesState(initialNodes);
  const [edges, , onEdgesChange] = useEdgesState(initialEdges);

  const onInit = useCallback(() => {}, []);

  return (
    <div className={cn("h-[500px] w-full rounded-lg border bg-gray-50", className)}>
      <ReactFlow
        nodes={nodes}
        edges={edges}
        onNodesChange={onNodesChange}
        onEdgesChange={onEdgesChange}
        onInit={onInit}
        fitView
        fitViewOptions={{ padding: 0.2 }}
        attributionPosition="bottom-left"
      >
        <Background variant={BackgroundVariant.Dots} gap={16} size={1} />
        <Controls />
        <MiniMap
          nodeColor={(node) => {
            const d = node.data as ProofNodeData;
            if (d.type === "conclusion") return "#4ade80";
            if (d.type === "axiom")      return "#60a5fa";
            return "#c084fc";
          }}
        />
        <Panel position="top-right">
          <div className="flex flex-col gap-1.5 rounded-md border bg-white p-3 text-xs shadow-sm">
            <Legend color="bg-green-400"  label="Conclusion" />
            <Legend color="bg-purple-400" label="Rule"       />
            <Legend color="bg-blue-400"   label="Axiom"      />
          </div>
        </Panel>
      </ReactFlow>
    </div>
  );
}

function Legend({ color, label }: { color: string; label: string }) {
  return (
    <div className="flex items-center gap-2">
      <span className={cn("h-2.5 w-2.5 rounded-full", color)} aria-hidden="true" />
      <span className="text-muted-foreground">{label}</span>
    </div>
  );
}
