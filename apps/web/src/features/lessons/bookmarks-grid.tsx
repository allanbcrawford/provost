"use client";

import { Icon } from "@provost/ui";
import Link from "next/link";
import type { Id } from "../../../../../convex/_generated/dataModel";

type BookmarkRow = {
  _id: Id<"lesson_bookmarks">;
  lesson_id: Id<"lessons">;
  title: string;
  description: string;
  category: string;
  created_at: number;
};

export function BookmarksGrid({ bookmarks }: { bookmarks: BookmarkRow[] | null }) {
  if (bookmarks === null) {
    return <p className="text-[14px] tracking-[-0.42px] text-provost-text-secondary">Loading…</p>;
  }
  if (bookmarks.length === 0) {
    return (
      <div className="rounded-[14px] border border-provost-border-subtle border-dashed bg-white p-8 text-center text-[14px] tracking-[-0.42px] text-provost-text-secondary">
        No bookmarks yet. Save a lesson from its reader page to find it here.
      </div>
    );
  }
  return (
    <ul className="grid grid-cols-1 gap-4 md:grid-cols-2 lg:grid-cols-3">
      {bookmarks.map((b) => (
        <li
          key={b._id}
          className="overflow-hidden rounded-[14px] border border-provost-border-subtle bg-white"
        >
          <Link href={`/lessons/${b.lesson_id}`} className="block p-5 hover:bg-provost-bg-muted/40">
            <div className="mb-3 flex items-center gap-2 text-[12px] tracking-[-0.36px] text-provost-text-secondary">
              <Icon name="bookmark" size={14} weight={400} />
              <span>{b.category}</span>
            </div>
            <h3 className="text-[18px] font-bold leading-[1.26] tracking-[-0.72px] text-provost-text-primary">
              {b.title}
            </h3>
            <p className="mt-2 text-[14px] font-light leading-[1.4] tracking-[-0.42px] text-provost-text-secondary line-clamp-3">
              {b.description}
            </p>
          </Link>
        </li>
      ))}
    </ul>
  );
}
