"use client";

import { Icon, type LayerOption, LayerToggle, Tabs, TabsList, TabsTrigger } from "@provost/ui";
import { ReactFlowProvider, useReactFlow } from "@xyflow/react";
import { useQuery } from "convex/react";
import { useCallback, useMemo, useState } from "react";
import { useSelectedFamily } from "@/context/family-context";
import { useWidgetSlot } from "@/context/widget-portal-context";
import { MembersList } from "@/features/family/members-list";
import { adaptGraphPayload } from "@/features/graph/adapt-convex";
import { buildGraph, buildPayloadFromConvex, filterByLayers } from "@/features/graph/build-graph";
import { FamilyGraph } from "@/features/graph/family-graph";
import type { LayerKey, LayerState, SelectedNode } from "@/features/graph/types";
import { ProfessionalsList } from "@/features/professionals/professionals-list";
import { DetailPanel } from "@/features/signals/detail-panel";
import { DraftRevisionModal } from "@/features/signals/draft-revision-modal";
import { SignalsRail } from "@/features/signals/signals-rail";
import type { CustomEdits, RevisionState } from "@/features/waterfall/types";
import { WaterfallModal } from "@/features/waterfall/waterfall-modal";
import { withRoleGuard } from "@/HOCs/with-role-guard";
import { APP_ROLES } from "@/lib/roles";
import { api } from "../../../../../../convex/_generated/api";
import type { Id } from "../../../../../../convex/_generated/dataModel";

type FamilyTab = "our-family" | "professionals";
type FamilyView = "tree" | "list";

const INITIAL_LAYERS: LayerState = {
  people: true,
  documents: true,
  signals: true,
  professionals: true,
};

const LAYER_OPTIONS: LayerOption<LayerKey>[] = [
  { key: "people", label: "People" },
  { key: "documents", label: "Documents" },
  { key: "signals", label: "Signals" },
  { key: "professionals", label: "Professionals" },
];

type WaterfallWidgetProps = {
  revisions?: RevisionState;
  customEdits?: CustomEdits;
};

function FamilyGraphScene() {
  const family = useSelectedFamily();
  const graphData = useQuery(
    api.family.getGraph,
    family ? { familyId: family._id as Id<"families"> } : "skip",
  );

  const payload = useMemo(() => {
    if (!graphData) return null;
    return buildPayloadFromConvex(adaptGraphPayload(graphData));
  }, [graphData]);

  const base = useMemo(() => (payload ? buildGraph(payload) : { nodes: [], edges: [] }), [payload]);

  const [layers, setLayers] = useState<LayerState>(INITIAL_LAYERS);
  const [selected, setSelected] = useState<SelectedNode>(null);
  const [sentIds, setSentIds] = useState<Set<string>>(new Set());
  const [draftingSignalId, setDraftingSignalId] = useState<string | null>(null);
  const [activeHighlightSignalId, setActiveHighlightSignalId] = useState<string | null>(null);
  const [simOpen, setSimOpen] = useState(false);
  const [simSeed, setSimSeed] = useState<WaterfallWidgetProps>({});

  const { widget, clear } = useWidgetSlot("family-page");
  const { setCenter, getNode } = useReactFlow();

  const { nodes, edges } = useMemo(
    () => filterByLayers(base.nodes, base.edges, layers),
    [base, layers],
  );

  const counts = payload
    ? {
        people: payload.members.length,
        documents: payload.documents.length,
        signals: payload.signals.length,
        professionals: payload.professionals.length,
      }
    : { people: 0, documents: 0, signals: 0, professionals: 0 };

  const focus = useCallback(
    (sel: SelectedNode) => {
      setSelected(sel);
      if (!sel) return;
      setLayers((prev) => {
        const needed: LayerKey =
          sel.kind === "member"
            ? "people"
            : sel.kind === "document"
              ? "documents"
              : sel.kind === "signal"
                ? "signals"
                : "professionals";
        return prev[needed] ? prev : { ...prev, [needed]: true };
      });
      requestAnimationFrame(() => {
        const node = getNode(sel.id);
        if (node) {
          setCenter(node.position.x + 110, node.position.y + 40, { zoom: 1, duration: 400 });
        }
      });
    },
    [getNode, setCenter],
  );

  const handleShowInGraph = useCallback((signalId: string) => {
    setActiveHighlightSignalId((prev) => (prev === signalId ? null : signalId));
  }, []);

  const handleSendToPlanner = useCallback((signalId: string) => {
    setSentIds((prev) => {
      const next = new Set(prev);
      next.add(signalId);
      return next;
    });
    setDraftingSignalId(null);
  }, []);

  if (widget) {
    if (widget.kind === "waterfall" && !simOpen) {
      const p = (widget.props ?? {}) as WaterfallWidgetProps;
      setSimSeed(p);
      setSimOpen(true);
      clear();
    } else if (widget.kind === "graph-focus") {
      const p = widget.props as {
        nodeId?: string;
        kind?: SelectedNode extends null ? never : NonNullable<SelectedNode>["kind"];
      };
      if (p.nodeId && p.kind) {
        focus({ kind: p.kind, id: p.nodeId } as SelectedNode);
      }
      clear();
    }
  }

  const selectedId = selected?.id ?? null;
  const draftingSignal =
    draftingSignalId && payload
      ? (payload.signals.find((s) => s.id === draftingSignalId) ?? null)
      : null;

  const loading = graphData === undefined || !payload;

  return (
    <div className="flex h-full min-h-0 w-full flex-col">
      {loading || !payload ? (
        <div className="flex flex-1 items-center justify-center text-[13px] text-provost-text-secondary">
          Loading family graph…
        </div>
      ) : (
        <div className="flex min-h-0 flex-1">
          <SignalsRail
            signals={payload.signals}
            sentIds={sentIds}
            onFocus={focus}
            selectedId={selectedId}
          />

          <div className="relative min-w-0 flex-1">
            <FamilyGraph
              nodes={nodes}
              edges={edges}
              onSelect={setSelected}
              selectedId={selectedId}
            />

            <div className="pointer-events-none absolute top-4 right-4 z-10">
              <div className="pointer-events-auto flex items-center gap-2 rounded-full border border-provost-border-subtle bg-white/95 px-2 py-1 shadow-sm backdrop-blur">
                <LayerToggle
                  layers={LAYER_OPTIONS}
                  value={layers}
                  onChange={(next) => setLayers(next)}
                />
                <span className="px-2 text-[10.5px] text-provost-text-tertiary">
                  {counts.people}·{counts.documents}·{counts.signals}·{counts.professionals}
                </span>
              </div>
            </div>
          </div>

          <DetailPanel
            selected={selected}
            payload={payload}
            sentIds={sentIds}
            onClose={() => setSelected(null)}
            onFocus={focus}
            onDraftRevision={(signalId) => setDraftingSignalId(signalId)}
            onShowInGraph={handleShowInGraph}
            activeHighlightSignalId={activeHighlightSignalId}
          />
        </div>
      )}

      {draftingSignal && payload && (
        <DraftRevisionModal
          signal={draftingSignal}
          payload={payload}
          onClose={() => setDraftingSignalId(null)}
          onSend={() => handleSendToPlanner(draftingSignal.id)}
        />
      )}

      <WaterfallModal
        open={simOpen}
        onClose={() => {
          setSimOpen(false);
          setSimSeed({});
        }}
        initialRevisions={simSeed.revisions}
        initialCustomEdits={simSeed.customEdits}
      />
    </div>
  );
}

function FamilyPageContent() {
  const family = useSelectedFamily();
  const [activeTab, setActiveTab] = useState<FamilyTab>("our-family");
  const [view, setView] = useState<FamilyView>("list");

  const graphData = useQuery(
    api.family.getGraph,
    family ? { familyId: family._id as Id<"families"> } : "skip",
  );
  const members = graphData?.members ?? [];

  return (
    <div className="flex h-full min-h-0 w-full flex-col">
      <div className="flex-shrink-0 px-8 pt-8 pb-0">
        <h1 className="mb-8 font-dm-serif text-[44px] leading-[1.05] tracking-[-0.02em] text-provost-text-primary">
          People
        </h1>

        <div className="flex items-end justify-between">
          <Tabs value={activeTab} onValueChange={(v) => setActiveTab(v as FamilyTab)}>
            <TabsList>
              <TabsTrigger value="our-family">Our Family</TabsTrigger>
              <TabsTrigger value="professionals">Professionals</TabsTrigger>
            </TabsList>
          </Tabs>

          {activeTab === "our-family" && (
            <div className="mb-2 flex items-center gap-1.5">
              <button
                type="button"
                onClick={() => setView("tree")}
                aria-pressed={view === "tree"}
                aria-label="Tree view"
                className={`flex size-9 items-center justify-center rounded-lg border transition-colors ${
                  view === "tree"
                    ? "border-provost-border-strong text-provost-text-primary"
                    : "border-transparent text-provost-text-secondary hover:bg-provost-bg-secondary"
                }`}
              >
                <Icon name="account_tree" size={20} weight={200} />
              </button>
              <button
                type="button"
                onClick={() => setView("list")}
                aria-pressed={view === "list"}
                aria-label="List view"
                className={`flex size-9 items-center justify-center rounded-lg border transition-colors ${
                  view === "list"
                    ? "border-provost-border-strong text-provost-text-primary"
                    : "border-transparent text-provost-text-secondary hover:bg-provost-bg-secondary"
                }`}
              >
                <Icon name="format_list_bulleted" size={20} weight={200} />
              </button>
            </div>
          )}
        </div>
      </div>

      <div className="min-h-0 flex-1">
        {activeTab === "our-family" ? (
          view === "tree" ? (
            <ReactFlowProvider>
              <FamilyGraphScene />
            </ReactFlowProvider>
          ) : (
            <div className="h-full overflow-auto px-8 pt-6 pb-8">
              <MembersList members={members} />
            </div>
          )
        ) : (
          <div className="h-full overflow-auto p-8 pt-4">
            <ProfessionalsList />
          </div>
        )}
      </div>
    </div>
  );
}

export default withRoleGuard(FamilyPageContent, APP_ROLES.FAMILY ?? []);
