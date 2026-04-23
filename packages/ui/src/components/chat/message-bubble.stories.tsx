import type { Meta, StoryObj } from "@storybook/react";
import { MessageBubble } from "./message-bubble";

const meta: Meta<typeof MessageBubble> = {
  title: "Chat/MessageBubble",
  component: MessageBubble,
  tags: ["autodocs"],
};
export default meta;

type Story = StoryObj<typeof MessageBubble>;

export const User: Story = {
  args: { role: "user", children: "Hello, how are you today?" },
};

export const Assistant: Story = {
  args: { role: "assistant", children: "I'm doing well. How can I help?" },
};

export const Tool: Story = {
  args: { role: "tool", children: "Tool output: 42 results found." },
};
