import type { Meta, StoryObj } from "@storybook/react";
import { Icon } from "./icon";

const meta: Meta<typeof Icon> = {
  title: "Primitives/Icon",
  component: Icon,
  tags: ["autodocs"],
};
export default meta;

type Story = StoryObj<typeof Icon>;

const common = ["home", "menu", "search", "person", "close", "add", "check"];

export const Grid: Story = {
  render: () => (
    <div className="grid grid-cols-4 gap-4">
      {common.map((name) => (
        <div key={name} className="flex flex-col items-center gap-1 text-xs">
          <Icon name={name} size={24} />
          <span>{name}</span>
        </div>
      ))}
    </div>
  ),
};

export const Filled: Story = {
  render: () => <Icon name="favorite" size={32} filled />,
};

export const HeavyWeight: Story = {
  render: () => <Icon name="bolt" size={32} weight={700} />,
};
