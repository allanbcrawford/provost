"use client";

import { Icon } from "@provost/ui";
import Link from "next/link";
import { useState } from "react";
import type { Id } from "../../../../../convex/_generated/dataModel";

type LessonNode = {
  _id: Id<"lessons">;
  title: string;
  sort_order: number;
};

type TrackNode = {
  _id: Id<"tracks">;
  title: string;
  sort_order: number;
  lessons: LessonNode[];
};

type ProgramNode = {
  _id: Id<"programs">;
  title: string;
  stewardship_phase: string;
  sort_order: number;
  tracks: TrackNode[];
};

const PHASE_LABEL: Record<string, string> = {
  emerging: "Emerging Stewards",
  developing: "Developing Stewards",
  operating: "Operating Stewards",
  enduring: "Enduring Stewards",
};

export function ProgramsTree({ tree }: { tree: ProgramNode[] | null }) {
  if (tree === null) {
    return <p className="text-[14px] text-provost-text-secondary tracking-[-0.42px]">Loading…</p>;
  }
  if (tree.length === 0) {
    return (
      <div className="rounded-[14px] border border-provost-border-subtle border-dashed bg-white p-8 text-center text-[14px] text-provost-text-secondary tracking-[-0.42px]">
        No programs yet. Run the learning migration to scaffold the curriculum.
      </div>
    );
  }
  return (
    <ul className="flex flex-col gap-3">
      {tree.map((p) => (
        <ProgramRow key={p._id} program={p} />
      ))}
    </ul>
  );
}

function ProgramRow({ program }: { program: ProgramNode }) {
  const [open, setOpen] = useState(false);
  const totalLessons = program.tracks.reduce((sum, t) => sum + t.lessons.length, 0);
  return (
    <li className="overflow-hidden rounded-[14px] border border-provost-border-subtle bg-white">
      <button
        type="button"
        onClick={() => setOpen((v) => !v)}
        className="flex w-full items-center gap-4 px-5 py-4 text-left hover:bg-provost-bg-muted/40"
      >
        <Icon
          name={open ? "expand_more" : "chevron_right"}
          size={20}
          weight={400}
          className="text-provost-text-secondary"
        />
        <div className="flex-1">
          <h3 className="font-bold text-[18px] text-provost-text-primary leading-[1.26] tracking-[-0.72px]">
            {program.title}
          </h3>
          <p className="mt-1 text-[12px] text-provost-text-secondary tracking-[-0.36px]">
            {PHASE_LABEL[program.stewardship_phase] ?? program.stewardship_phase} ·{" "}
            {program.tracks.length} track{program.tracks.length === 1 ? "" : "s"} · {totalLessons}{" "}
            lesson{totalLessons === 1 ? "" : "s"}
          </p>
        </div>
      </button>
      {open && (
        <div className="border-provost-border-subtle border-t bg-provost-bg-muted/20 px-5 py-4">
          {program.tracks.length === 0 ? (
            <p className="text-[13px] text-provost-text-secondary tracking-[-0.39px]">
              No tracks in this program yet.
            </p>
          ) : (
            <ul className="flex flex-col gap-3">
              {program.tracks.map((t) => (
                <li key={t._id}>
                  <h4 className="font-medium text-[14px] text-provost-text-primary tracking-[-0.42px]">
                    {t.title}
                  </h4>
                  <ul className="mt-1 flex flex-col gap-1 pl-3">
                    {t.lessons.map((l) => (
                      <li key={l._id}>
                        <Link
                          href={`/lessons/${l._id}`}
                          className="text-[13px] text-provost-text-secondary tracking-[-0.39px] hover:text-provost-text-primary"
                        >
                          {l.title}
                        </Link>
                      </li>
                    ))}
                  </ul>
                </li>
              ))}
            </ul>
          )}
        </div>
      )}
    </li>
  );
}
