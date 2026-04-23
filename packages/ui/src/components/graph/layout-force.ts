"use client";

import type { Edge, Node } from "@xyflow/react";
import {
  forceCenter,
  forceCollide,
  forceLink,
  forceManyBody,
  forceSimulation,
  forceY,
  type SimulationNodeDatum,
} from "d3-force";

type LayoutInputNode = {
  id: string;
  /** optional target Y (for row-locked nodes) */
  anchorY?: number;
  /** strength to pull toward anchorY (0 = free). Default 0. */
  anchorYStrength?: number;
  /** optional initial position */
  x?: number;
  y?: number;
};

type LayoutInputEdge = {
  source: string;
  target: string;
  /** desired edge distance in px */
  distance?: number;
};

export type ForceLayoutOptions = {
  iterations?: number;
  chargeStrength?: number;
  collideRadius?: number;
  linkStrength?: number;
  centerX?: number;
  centerY?: number;
  defaultDistance?: number;
};

type SimNode = SimulationNodeDatum & {
  id: string;
  anchorY?: number;
  anchorYStrength?: number;
};

type SimLink = { source: string; target: string; distance: number };

/**
 * Compute a force-directed layout and return positioned React Flow nodes.
 * Domain-agnostic — caller provides inputs with ids + optional anchors.
 */
export function computeForceLayout(
  nodes: LayoutInputNode[],
  edges: LayoutInputEdge[],
  opts: ForceLayoutOptions = {},
): Map<string, { x: number; y: number }> {
  const {
    iterations = 320,
    chargeStrength = -650,
    collideRadius = 150,
    linkStrength = 0.6,
    centerX = 0,
    centerY = 0,
    defaultDistance = 200,
  } = opts;

  const simNodes: SimNode[] = nodes.map((n) => ({
    id: n.id,
    anchorY: n.anchorY,
    anchorYStrength: n.anchorYStrength,
    x: n.x ?? (Math.random() - 0.5) * 1200,
    y: n.y ?? n.anchorY ?? (Math.random() - 0.5) * 800,
  }));

  const simLinks: SimLink[] = edges.map((e) => ({
    source: e.source,
    target: e.target,
    distance: e.distance ?? defaultDistance,
  }));

  const sim = forceSimulation(simNodes)
    .force(
      "link",
      forceLink<SimNode, SimLink>(simLinks as never)
        .id((n: SimNode) => n.id)
        .distance((l: SimLink) => l.distance)
        .strength(linkStrength),
    )
    .force("charge", forceManyBody<SimNode>().strength(chargeStrength))
    .force("center", forceCenter(centerX, centerY))
    .force("collide", forceCollide<SimNode>(collideRadius))
    .force(
      "y",
      forceY<SimNode>((n) => n.anchorY ?? 0).strength((n) => n.anchorYStrength ?? 0),
    )
    .stop();

  for (let i = 0; i < iterations; i++) sim.tick();

  const positions = new Map<string, { x: number; y: number }>();
  for (const n of simNodes) {
    positions.set(n.id, { x: n.x ?? 0, y: n.y ?? 0 });
  }
  return positions;
}

/** Convenience: apply computed positions onto an existing set of React Flow nodes. */
export function applyLayout<N extends Node>(
  nodes: N[],
  positions: Map<string, { x: number; y: number }>,
): N[] {
  return nodes.map((n) => {
    const pos = positions.get(n.id);
    return pos ? { ...n, position: pos } : n;
  });
}

/** Pass-through helper for edges — domain code can decide styling. */
export function passthroughEdges<E extends Edge>(edges: E[]): E[] {
  return edges;
}

export type { LayoutInputEdge, LayoutInputNode };
