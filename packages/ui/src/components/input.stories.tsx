import type { Meta, StoryObj } from "@storybook/react";
import { Input } from "./input";
import { Label } from "./label";

const meta: Meta<typeof Input> = {
  title: "Primitives/Input",
  component: Input,
  tags: ["autodocs"],
};
export default meta;

type Story = StoryObj<typeof Input>;

export const Default: Story = { args: { placeholder: "Enter text..." } };

export const WithLabel: Story = {
  render: (args: React.ComponentProps<typeof Input>) => (
    <div className="flex w-72 flex-col gap-2">
      <Label htmlFor="email">Email</Label>
      <Input id="email" type="email" placeholder="you@example.com" {...args} />
    </div>
  ),
};

export const Disabled: Story = { args: { disabled: true, placeholder: "Disabled" } };

export const ErrorState: Story = {
  args: { placeholder: "Invalid value", "aria-invalid": true, defaultValue: "oops" },
};
