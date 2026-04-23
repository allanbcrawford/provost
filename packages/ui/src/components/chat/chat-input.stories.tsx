import type { Meta, StoryObj } from "@storybook/react";
import { ChatInput } from "./chat-input";

const meta: Meta<typeof ChatInput> = {
  title: "Chat/ChatInput",
  component: ChatInput,
  tags: ["autodocs"],
  args: { onSend: () => {} },
};
export default meta;

type Story = StoryObj<typeof ChatInput>;

export const Idle: Story = {
  render: (args: React.ComponentProps<typeof ChatInput>) => (
    <div className="w-[480px]">
      <ChatInput {...args} />
    </div>
  ),
};

export const PendingApproval: Story = {
  args: { pendingApproval: true },
  render: (args: React.ComponentProps<typeof ChatInput>) => (
    <div className="w-[480px]">
      <ChatInput {...args} />
    </div>
  ),
};
