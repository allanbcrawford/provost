import type { Meta, StoryObj } from "@storybook/react";
import type { Edge, Node } from "@xyflow/react";
import { GraphCanvas } from "./graph-canvas";

const meta: Meta<typeof GraphCanvas> = {
  title: "Graph/GraphCanvas",
  component: GraphCanvas,
  tags: ["autodocs"],
  parameters: { layout: "fullscreen" },
};
export default meta;

type Story = StoryObj<typeof GraphCanvas>;

const nodes: Node[] = [
  { id: "1", position: { x: 0, y: 0 }, data: { label: "Root" } },
  { id: "2", position: { x: 200, y: -80 }, data: { label: "Child A" } },
  { id: "3", position: { x: 200, y: 80 }, data: { label: "Child B" } },
  { id: "4", position: { x: 400, y: 0 }, data: { label: "Leaf" } },
];

const edges: Edge[] = [
  { id: "e1-2", source: "1", target: "2" },
  { id: "e1-3", source: "1", target: "3" },
  { id: "e2-4", source: "2", target: "4" },
  { id: "e3-4", source: "3", target: "4" },
];

export const Basic: Story = {
  render: () => (
    <div style={{ width: "100%", height: 400 }}>
      <GraphCanvas nodes={nodes} edges={edges} />
    </div>
  ),
};
