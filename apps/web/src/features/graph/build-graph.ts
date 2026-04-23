import { computeForceLayout, type LayoutInputEdge, type LayoutInputNode } from "@provost/ui";
import type { Edge, Node } from "@xyflow/react";
import { deriveDocProfLinks, deriveMemberDocLinks } from "./derive-links";
import { computeSignals } from "./signal-rules";
import type { Document, GraphPayload, LayerState, Member, Professional, Signal } from "./types";

export function buildPayloadFromConvex(input: {
  members: Member[];
  documents: Document[];
  professionals: Professional[];
}): GraphPayload {
  const { members, documents, professionals } = input;
  const memberDocLinks = deriveMemberDocLinks(members, documents);
  const docProfLinks = deriveDocProfLinks(documents, professionals);
  const signals = computeSignals({
    members,
    docs: documents,
    pros: professionals,
    memberDocLinks,
    docProfLinks,
  });
  return { members, documents, professionals, memberDocLinks, docProfLinks, signals };
}

const MEMBER_ROW_Y = (generation: number) => generation * 260;

export function buildGraph(payload: GraphPayload): { nodes: Node[]; edges: Edge[] } {
  const { members, documents, professionals, memberDocLinks, docProfLinks, signals } = payload;

  const layoutNodes: LayoutInputNode[] = [];
  const memberById = new Map<string, Member>();

  for (const m of members) {
    memberById.set(m.id, m);
    layoutNodes.push({
      id: m.id,
      anchorY: MEMBER_ROW_Y(m.generation),
      anchorYStrength: 0.25,
      x: Math.random() * 800,
      y: MEMBER_ROW_Y(m.generation),
    });
  }
  for (const d of documents) {
    layoutNodes.push({ id: d.id, x: (Math.random() - 0.5) * 1200, y: (Math.random() - 0.5) * 800 });
  }
  for (const p of professionals) {
    layoutNodes.push({
      id: p.id,
      x: (Math.random() - 0.5) * 1600,
      y: (Math.random() - 0.5) * 1000,
    });
  }
  for (const s of signals) {
    layoutNodes.push({ id: s.id, x: (Math.random() - 0.5) * 1000, y: (Math.random() - 0.5) * 900 });
  }

  const layoutEdges: LayoutInputEdge[] = [];
  const seenSpouse = new Set<string>();
  for (const m of members) {
    if (m.spouse_id && memberById.has(m.spouse_id)) {
      const key = [m.id, m.spouse_id].sort().join("|");
      if (!seenSpouse.has(key)) {
        seenSpouse.add(key);
        layoutEdges.push({ source: m.id, target: m.spouse_id, distance: 140 });
      }
    }
    if (m.father_id && memberById.has(m.father_id)) {
      layoutEdges.push({ source: m.father_id, target: m.id, distance: 220 });
    }
    if (m.mother_id && memberById.has(m.mother_id)) {
      layoutEdges.push({ source: m.mother_id, target: m.id, distance: 220 });
    }
  }
  for (const link of memberDocLinks) {
    layoutEdges.push({ source: link.memberId, target: link.documentId, distance: 180 });
  }
  for (const link of docProfLinks) {
    layoutEdges.push({ source: link.documentId, target: link.professionalId, distance: 260 });
  }
  for (const s of signals) {
    for (const mid of s.memberIds) {
      layoutEdges.push({ source: mid, target: s.id, distance: 130 });
    }
    if (s.memberIds.length === 0 && s.relatedDocumentId) {
      layoutEdges.push({ source: s.relatedDocumentId, target: s.id, distance: 130 });
    }
  }

  const positions = computeForceLayout(layoutNodes, layoutEdges, {
    iterations: 320,
    chargeStrength: -650,
    collideRadius: 150,
    linkStrength: 0.6,
  });

  const nodes: Node[] = [];
  const signalsByMember = new Map<string, Signal[]>();
  const signalsByDoc = new Map<string, Signal[]>();
  for (const s of signals) {
    for (const mid of s.memberIds) {
      if (!signalsByMember.has(mid)) signalsByMember.set(mid, []);
      signalsByMember.get(mid)?.push(s);
    }
    if (s.relatedDocumentId) {
      if (!signalsByDoc.has(s.relatedDocumentId)) signalsByDoc.set(s.relatedDocumentId, []);
      signalsByDoc.get(s.relatedDocumentId)?.push(s);
    }
  }

  const posOr = (id: string) => positions.get(id) ?? { x: 0, y: 0 };

  for (const m of members) {
    nodes.push({
      id: m.id,
      type: "member",
      position: posOr(m.id),
      data: { member: m, signals: signalsByMember.get(m.id) ?? [] },
    });
  }
  for (const d of documents) {
    nodes.push({
      id: d.id,
      type: "document",
      position: posOr(d.id),
      data: { document: d, signals: signalsByDoc.get(d.id) ?? [] },
    });
  }
  for (const p of professionals) {
    nodes.push({
      id: p.id,
      type: "professional",
      position: posOr(p.id),
      data: { professional: p },
    });
  }
  for (const s of signals) {
    nodes.push({ id: s.id, type: "signal", position: posOr(s.id), data: { signal: s } });
  }

  const edges: Edge[] = [];
  const seenSpouseEdge = new Set<string>();
  for (const m of members) {
    if (m.spouse_id && memberById.has(m.spouse_id)) {
      const key = [m.id, m.spouse_id].sort().join("|");
      if (!seenSpouseEdge.has(key)) {
        seenSpouseEdge.add(key);
        edges.push({
          id: `e-spouse-${key}`,
          source: m.id,
          target: m.spouse_id,
          data: { kind: "spouse" },
          style: { stroke: "#0163ad", strokeWidth: 1.5 },
        });
      }
    }
    if (m.father_id && memberById.has(m.father_id)) {
      edges.push({
        id: `e-parent-${m.father_id}-${m.id}`,
        source: m.father_id,
        target: m.id,
        data: { kind: "parent" },
        style: { stroke: "#b3b3b3", strokeWidth: 1, strokeDasharray: "4,4" },
      });
    }
    if (m.mother_id && memberById.has(m.mother_id)) {
      edges.push({
        id: `e-parent-${m.mother_id}-${m.id}`,
        source: m.mother_id,
        target: m.id,
        data: { kind: "parent" },
        style: { stroke: "#b3b3b3", strokeWidth: 1, strokeDasharray: "4,4" },
      });
    }
  }
  for (const link of memberDocLinks) {
    edges.push({
      id: `e-md-${link.memberId}-${link.documentId}`,
      source: link.memberId,
      target: link.documentId,
      data: { kind: "member-doc" },
      style: { stroke: "#9ca3af", strokeWidth: 1 },
    });
  }
  for (const link of docProfLinks) {
    edges.push({
      id: `e-dp-${link.documentId}-${link.professionalId}`,
      source: link.documentId,
      target: link.professionalId,
      data: { kind: "doc-prof" },
      style: { stroke: "#0f766e", strokeWidth: 1, strokeDasharray: "2,3" },
    });
  }
  for (const s of signals) {
    for (const mid of s.memberIds) {
      edges.push({
        id: `e-ms-${mid}-${s.id}`,
        source: mid,
        target: s.id,
        data: { kind: "member-signal", signalId: s.id },
        style: { stroke: "#b91c1c", strokeWidth: 1, strokeDasharray: "3,3" },
      });
    }
    if (s.memberIds.length === 0 && s.relatedDocumentId) {
      edges.push({
        id: `e-ds-${s.relatedDocumentId}-${s.id}`,
        source: s.relatedDocumentId,
        target: s.id,
        data: { kind: "doc-signal", signalId: s.id },
        style: { stroke: "#b91c1c", strokeWidth: 1, strokeDasharray: "3,3" },
      });
    }
  }

  return { nodes, edges };
}

export function filterByLayers(
  nodes: Node[],
  edges: Edge[],
  layers: LayerState,
  flaggedOnly = false,
): { nodes: Node[]; edges: Edge[] } {
  const keepByLayer = (n: Node) => {
    switch (n.type) {
      case "member":
        return layers.people;
      case "document":
        return layers.documents;
      case "signal":
        return layers.signals;
      case "professional":
        return layers.professionals;
      default:
        return true;
    }
  };

  let keptIds: Set<string>;
  if (flaggedOnly) {
    const flaggedNodeIds = new Set<string>();
    for (const n of nodes) {
      if (n.type === "signal") {
        flaggedNodeIds.add(n.id);
      } else if (n.type === "member" || n.type === "document") {
        const sigs = (n.data as { signals?: unknown[] }).signals;
        if (Array.isArray(sigs) && sigs.length > 0) flaggedNodeIds.add(n.id);
      }
    }
    keptIds = new Set(
      nodes.filter((n) => flaggedNodeIds.has(n.id) && keepByLayer(n)).map((n) => n.id),
    );
  } else {
    keptIds = new Set(nodes.filter(keepByLayer).map((n) => n.id));
  }

  const fNodes = nodes.filter((n) => keptIds.has(n.id));
  const fEdges = edges.filter((e) => keptIds.has(e.source) && keptIds.has(e.target));
  return { nodes: fNodes, edges: fEdges };
}
