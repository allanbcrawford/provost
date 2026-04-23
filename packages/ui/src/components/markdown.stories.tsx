import type { Meta, StoryObj } from "@storybook/react";
import { Markdown } from "./markdown";

const meta: Meta<typeof Markdown> = {
  title: "Primitives/Markdown",
  component: Markdown,
  tags: ["autodocs"],
};
export default meta;

type Story = StoryObj<typeof Markdown>;

const sample = `# Heading 1

Some **bold** text and _italic_ text with a [link](https://example.com).

## List

- One
- Two
- Three

## Code

\`\`\`ts
const x: number = 42;
\`\`\`
`;

export const Basic: Story = {
  render: () => <Markdown>{sample}</Markdown>,
};
