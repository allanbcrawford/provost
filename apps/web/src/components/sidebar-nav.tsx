"use client";

import { Icon } from "@provost/ui";
import { useMutation, useQuery } from "convex/react";
import Image from "next/image";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { useState } from "react";
import { useAuthedFamily } from "@/context/family-context";
import { usePreloadedThreads } from "@/context/preloaded-data-context";
import { useSidebar } from "@/context/sidebar-context";
import { useChatPanel } from "@/features/chat/chat-panel-context";
import { useUserRole } from "@/hooks/use-user-role";
import { AuthedPreloadedQuery } from "@/lib/authed-preloaded-query";
import { APP_ROLES, type Role } from "@/lib/roles";
import { api } from "../../../../convex/_generated/api";
import type { Id } from "../../../../convex/_generated/dataModel";

type NavItem = {
  key: keyof typeof APP_ROLES;
  label: string;
  href: string;
  icon?: string;
  customIconSrc?: string;
};

// Ordered to match provost-fe's sidebar, with our additional routes woven in
// at intuitive positions.
const NAV_ITEMS: NavItem[] = [
  { key: "HOME", label: "Highlights", href: "/", customIconSrc: "/icons/highlights.svg" },
  { key: "MESSAGES", label: "Messages", href: "/messages", icon: "inbox_text" },
  { key: "EVENTS", label: "Events", href: "/events", icon: "calendar_month" },
  { key: "ASSETS", label: "Assets", href: "/assets", icon: "request_quote" },
  { key: "SIGNALS", label: "Signals", href: "/signals", icon: "notifications_active" },
  { key: "SIMULATIONS", label: "Simulations", href: "/simulations", icon: "analytics" },
  { key: "DOCUMENTS", label: "Documents", href: "/documents", icon: "article" },
  { key: "LESSONS", label: "Lessons", href: "/lessons", icon: "menu_book" },
  { key: "FAMILY", label: "People", href: "/family", icon: "account_circle" },
  { key: "LEGACY", label: "Legacy", href: "/legacy", icon: "nature" },
  { key: "SETTINGS", label: "Settings", href: "/settings", icon: "settings" },
];

function isActive(pathname: string, href: string): boolean {
  if (href === "/") return pathname === "/";
  return pathname === href || pathname.startsWith(`${href}/`);
}

function canSee(role: Role | null, key: keyof typeof APP_ROLES): boolean {
  if (!role) return key === "HOME" || key === "SETTINGS";
  const allowed = APP_ROLES[key];
  return !allowed || allowed.includes(role);
}

export function SidebarNav() {
  const pathname = usePathname() ?? "/";
  const role = useUserRole();
  const { isOpen, isMobile, close } = useSidebar();

  const items = NAV_ITEMS.filter((item) => canSee(role, item.key));

  const content = (
    <nav className="flex h-full flex-col overflow-y-auto pt-6">
      {items.map((item) => {
        const active = isActive(pathname, item.href);
        return (
          <Link
            key={item.href}
            href={item.href}
            onClick={() => {
              if (isMobile) close();
            }}
            className={`nav-item flex items-center px-5 py-3 text-[17px] transition-colors hover:bg-provost-bg-menu-hover ${
              active ? "text-provost-text-primary" : "text-provost-neutral-550"
            }`}
          >
            <span className="flex h-6 w-6 items-center justify-center text-gray-500">
              {item.customIconSrc ? (
                <Image
                  src={item.customIconSrc}
                  alt=""
                  width={21}
                  height={21}
                  className={active ? "text-provost-text-primary" : "text-provost-neutral-550"}
                  style={{ filter: active ? "none" : "opacity(0.6)" }}
                />
              ) : (
                item.icon && (
                  <Icon
                    name={item.icon}
                    size={29}
                    weight={200}
                    filled={active}
                    className={active ? "text-provost-text-primary" : "text-provost-neutral-550"}
                  />
                )
              )}
            </span>
            <span className="ml-[15px]">{item.label}</span>
          </Link>
        );
      })}
      <ThreadsSection />
    </nav>
  );

  if (isMobile) {
    return (
      <>
        {isOpen && (
          <button
            type="button"
            className="fixed inset-0 z-40 bg-black/30 transition-opacity"
            onClick={close}
            aria-label="Close sidebar"
          />
        )}
        <aside
          className={`fixed top-0 left-0 z-50 h-full w-[254px] transform bg-white shadow-lg transition-transform duration-200 ease-in-out ${
            isOpen ? "translate-x-0" : "-translate-x-full"
          }`}
        >
          {content}
        </aside>
      </>
    );
  }

  return (
    <aside
      className={`h-full shrink-0 overflow-hidden border-provost-border-subtle border-r bg-white transition-all duration-200 ease-in-out ${
        isOpen ? "w-[260px]" : "w-0"
      }`}
    >
      <div className="h-full min-w-[260px] overflow-hidden">{content}</div>
    </aside>
  );
}

// Collapsible "Threads" section. Lists the user's threads from Convex; clicking
// a thread opens it in the right-side chat rail. The trailing + creates a new
// thread and opens it in the rail. Threads get titled lazily on first send
// (see chat-rail.tsx / app/(app)/chat/page.tsx).
type ThreadRow = { _id: Id<"threads">; title: string | null; _creationTime: number };

function ThreadsSection() {
  const family = useAuthedFamily();
  const familyId = family?._id as Id<"families"> | undefined;
  const preloaded = usePreloadedThreads();
  if (!familyId && !preloaded) return null;
  if (preloaded) return <PreloadedThreadsSection preloaded={preloaded} familyId={familyId} />;
  return <LiveThreadsSection familyId={familyId} />;
}

function PreloadedThreadsSection({
  preloaded,
  familyId,
}: {
  preloaded: NonNullable<ReturnType<typeof usePreloadedThreads>>;
  familyId: Id<"families"> | undefined;
}) {
  return (
    <AuthedPreloadedQuery preloaded={preloaded}>
      {(threads) => <ThreadsSectionInner threads={threads as ThreadRow[]} familyId={familyId} />}
    </AuthedPreloadedQuery>
  );
}

function LiveThreadsSection({ familyId }: { familyId: Id<"families"> | undefined }) {
  const threads = useQuery(api.threads.list, familyId ? { familyId } : "skip") as
    | ThreadRow[]
    | undefined;
  return <ThreadsSectionInner threads={threads} familyId={familyId} />;
}

function ThreadsSectionInner({
  threads,
  familyId,
}: {
  threads: ThreadRow[] | undefined;
  familyId: Id<"families"> | undefined;
}) {
  const [expanded, setExpanded] = useState(false);
  const { isMobile, close } = useSidebar();
  const { openThreadId, setOpenThreadId, setIsOpen: setChatPanelOpen } = useChatPanel();
  const createThread = useMutation(api.threads.create);

  if (!familyId) return null;

  const openThread = (threadId: Id<"threads">) => {
    setOpenThreadId(threadId);
    setChatPanelOpen(true);
    if (isMobile) close();
  };

  const handleNewThread = async () => {
    if (!familyId) return;
    try {
      const { threadId } = await createThread({ familyId });
      openThread(threadId);
      setExpanded(true);
    } catch {
      // Swallow — surfacing here would need a toast system; rail will retry on
      // next interaction.
    }
  };

  return (
    <div className="mt-1 border-provost-border-subtle border-t pt-1">
      <button
        type="button"
        onClick={() => setExpanded((v) => !v)}
        className="nav-item flex w-full items-center px-5 py-3 text-[17px] text-provost-neutral-550 transition-colors hover:bg-provost-bg-menu-hover"
        aria-expanded={expanded}
        aria-controls="threads-list"
      >
        <span className="flex h-6 w-6 items-center justify-center text-gray-500">
          <Icon name="asterisk" size={24} weight={200} />
        </span>
        <span className="ml-[15px] flex-1 text-left">Threads</span>
        <Icon
          name={expanded ? "keyboard_arrow_up" : "keyboard_arrow_down"}
          size={20}
          className="text-provost-text-secondary"
        />
      </button>
      {expanded && (
        <ul id="threads-list" className="pb-2">
          <li>
            <button
              type="button"
              onClick={handleNewThread}
              className="flex w-full items-center px-5 py-2 text-left text-[14px] text-provost-text-primary transition-colors hover:bg-provost-bg-menu-hover"
            >
              <span className="flex h-5 w-5 shrink-0 items-center justify-center">
                <Icon name="add" size={16} className="text-provost-text-secondary" />
              </span>
              <span className="ml-[15px]">New Thread</span>
            </button>
          </li>
          {threads === undefined ? (
            <li className="px-5 py-2 text-[13px] text-provost-text-secondary">Loading…</li>
          ) : threads.length === 0 ? (
            <li className="px-5 py-2 text-[13px] text-provost-text-secondary">No threads yet</li>
          ) : (
            threads.map((t) => {
              const active = openThreadId === t._id;
              const label = (t.title ?? "").trim() || "Untitled";
              return (
                <li key={t._id}>
                  <button
                    type="button"
                    onClick={() => openThread(t._id)}
                    className={`flex w-full items-center px-5 py-2 text-left text-[14px] transition-colors hover:bg-provost-bg-menu-hover ${
                      active ? "text-provost-text-primary" : "text-provost-neutral-550"
                    }`}
                  >
                    <span className="flex h-5 w-5 shrink-0 items-center justify-center">
                      <Icon
                        name="trip_origin"
                        size={14}
                        weight={200}
                        className="text-provost-text-secondary"
                      />
                    </span>
                    <span className="ml-[15px] truncate">{label}</span>
                  </button>
                </li>
              );
            })
          )}
        </ul>
      )}
    </div>
  );
}
