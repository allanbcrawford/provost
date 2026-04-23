"use client";
import Link from "next/link";

export type TaskToolWidgetProps = {
  taskId: string;
  title: string;
  assigneeType: "planner" | "professional" | "member";
  status: "open" | "in_progress" | "completed" | "cancelled";
};

const ASSIGNEE_LABEL: Record<TaskToolWidgetProps["assigneeType"], string> = {
  planner: "Planner",
  professional: "Professional",
  member: "Family member",
};

export function TaskToolWidget({ taskId, title, assigneeType, status }: TaskToolWidgetProps) {
  return (
    <div className="rounded-[8px] border border-provost-border-subtle bg-provost-bg-muted px-3 py-2.5 text-[12.5px] text-provost-text-secondary">
      <div className="mb-1 flex items-center justify-between gap-2">
        <span className="font-semibold text-provost-text-primary">Task created</span>
        <span className="rounded-[4px] bg-provost-bg-primary px-1.5 py-0.5 text-[11px] font-medium text-provost-text-primary">
          {status}
        </span>
      </div>
      <div className="mb-0.5 text-provost-text-primary">{title}</div>
      <div className="mb-2 text-[11.5px] text-provost-text-tertiary">
        Assigned to {ASSIGNEE_LABEL[assigneeType]}
      </div>
      <Link
        href="/governance"
        className="inline-block rounded-[6px] border border-provost-border-subtle bg-provost-bg-primary px-2.5 py-1 text-[11.5px] font-medium text-provost-text-primary hover:bg-provost-bg-hover"
        data-task-id={taskId}
      >
        View in /governance
      </Link>
    </div>
  );
}
