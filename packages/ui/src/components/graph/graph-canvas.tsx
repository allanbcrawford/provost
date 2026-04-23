"use client";

import {
  Background,
  BackgroundVariant,
  Controls,
  type Edge,
  type Node,
  type NodeTypes,
  ReactFlow,
  ReactFlowProvider,
} from "@xyflow/react";
import "@xyflow/react/dist/style.css";
import { useCallback } from "react";
import { ZoomControls } from "./zoom-controls";

type GraphCanvasProps = {
  nodes: Node[];
  edges: Edge[];
  nodeTypes?: NodeTypes;
  selectedId?: string | null;
  onSelect?: (id: string | null) => void;
  showControls?: boolean;
  showZoomControls?: boolean;
  showBackground?: boolean;
};

function GraphCanvasInner({
  nodes,
  edges,
  nodeTypes,
  selectedId = null,
  onSelect,
  showControls = false,
  showZoomControls = true,
  showBackground = true,
}: GraphCanvasProps) {
  const onNodeClick = useCallback(
    (_e: React.MouseEvent, node: Node) => {
      onSelect?.(node.id);
    },
    [onSelect],
  );

  const onPaneClick = useCallback(() => {
    onSelect?.(null);
  }, [onSelect]);

  const nodesWithSelection = selectedId
    ? nodes.map((n) => ({ ...n, selected: n.id === selectedId }))
    : nodes;

  return (
    <ReactFlow
      nodes={nodesWithSelection}
      edges={edges}
      nodeTypes={nodeTypes}
      fitView
      fitViewOptions={{ padding: 0.2, maxZoom: 1 }}
      minZoom={0.2}
      maxZoom={2}
      panOnDrag
      zoomOnScroll
      zoomOnPinch
      zoomOnDoubleClick={false}
      nodesDraggable
      nodesConnectable={false}
      elementsSelectable
      onNodeClick={onNodeClick}
      onPaneClick={onPaneClick}
      proOptions={{ hideAttribution: true }}
      style={{ background: "transparent" }}
    >
      {showBackground && (
        <Background variant={BackgroundVariant.Dots} gap={18} size={1} color="#e5e7eb" />
      )}
      {showControls && <Controls />}
      {showZoomControls && <ZoomControls />}
    </ReactFlow>
  );
}

export function GraphCanvas(props: GraphCanvasProps) {
  return (
    <ReactFlowProvider>
      <GraphCanvasInner {...props} />
    </ReactFlowProvider>
  );
}

export type { GraphCanvasProps };
