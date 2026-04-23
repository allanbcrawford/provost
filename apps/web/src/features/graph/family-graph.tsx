"use client";

import { GraphCanvas } from "@provost/ui";
import type { Edge, Node } from "@xyflow/react";
import { useCallback } from "react";
import { DocumentNode } from "./document-node";
import { MemberNode } from "./member-node";
import { ProfessionalNode } from "./professional-node";
import { SignalNode } from "./signal-node";
import type { SelectedNode } from "./types";

const nodeTypes = {
  member: MemberNode,
  document: DocumentNode,
  professional: ProfessionalNode,
  signal: SignalNode,
};

type Props = {
  nodes: Node[];
  edges: Edge[];
  onSelect: (sel: SelectedNode) => void;
  selectedId: string | null;
};

export function FamilyGraph({ nodes, edges, onSelect, selectedId }: Props) {
  const handleSelect = useCallback(
    (id: string | null) => {
      if (!id) {
        onSelect(null);
        return;
      }
      const node = nodes.find((n) => n.id === id);
      const kind = node?.type;
      if (
        kind === "member" ||
        kind === "document" ||
        kind === "professional" ||
        kind === "signal"
      ) {
        onSelect({ kind, id });
      }
    },
    [nodes, onSelect],
  );

  return (
    <GraphCanvas
      nodes={nodes}
      edges={edges}
      nodeTypes={nodeTypes}
      selectedId={selectedId}
      onSelect={handleSelect}
    />
  );
}
