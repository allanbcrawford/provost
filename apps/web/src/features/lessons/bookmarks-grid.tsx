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
    return <p className="text-[14px] text-provost-text-secondary tracking-[-0.42px]">Loading…</p>;
  }
  if (bookmarks.length === 0) {
    return (
      <div className="rounded-[14px] border border-provost-border-subtle border-dashed bg-white p-8 text-center text-[14px] text-provost-text-secondary tracking-[-0.42px]">
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
            <div className="mb-3 flex items-center gap-2 text-[12px] text-provost-text-secondary tracking-[-0.36px]">
              <Icon name="bookmark" size={14} weight={400} />
              <span>{b.category}</span>
            </div>
            <h3 className="font-bold text-[18px] text-provost-text-primary leading-[1.26] tracking-[-0.72px]">
              {b.title}
            </h3>
            <p className="mt-2 line-clamp-3 font-light text-[14px] text-provost-text-secondary leading-[1.4] tracking-[-0.42px]">
              {b.description}
            </p>
          </Link>
        </li>
      ))}
    </ul>
  );
}
