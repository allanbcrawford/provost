"use client";

import { Icon } from "@provost/ui";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { Fragment, useMemo } from "react";
import { UserMenu } from "@/components/user-menu";
import { useBreadcrumbs } from "@/context/breadcrumb-context";
import { useSelectedFamily } from "@/context/family-context";
import { useSidebar } from "@/context/sidebar-context";
import { useChatPanel } from "@/features/chat/chat-panel-context";

function titleize(segment: string): string {
  const decoded = decodeURIComponent(segment);
  return decoded
    .split("-")
    .map((s) => (s.length === 0 ? s : (s[0] ?? "").toUpperCase() + s.slice(1)))
    .join(" ");
}

function buildCrumbsFromPath(pathname: string) {
  const parts = pathname.split("/").filter(Boolean);
  if (parts.length === 0) return [] as { label: string; href?: string }[];
  const crumbs: { label: string; href?: string }[] = [];
  let acc = "";
  for (const part of parts) {
    acc += `/${part}`;
    crumbs.push({ label: titleize(part), href: acc });
  }
  return crumbs;
}

export function Header() {
  const pathname = usePathname() ?? "/";
  const { overrides } = useBreadcrumbs();
  const family = useSelectedFamily();
  const { isOpen: isChatPanelOpen, setIsOpen: setChatPanelOpen, isFullScreen } = useChatPanel();
  const { toggle: toggleSidebar } = useSidebar();

  const crumbs = useMemo(() => overrides ?? buildCrumbsFromPath(pathname), [overrides, pathname]);

  const familyName = useMemo(() => {
    const raw = family?.name ?? "";
    // Normalize: drop parenthesized qualifiers (e.g. "(demo)"), collapse
    // whitespace, then peel off the "Family" suffix and "The" prefix before
    // returning the last remaining word as the surname.
    const cleaned = raw
      .replace(/\s*\([^)]*\)\s*/g, " ")
      .replace(/\s+/g, " ")
      .trim()
      .replace(/\s+Family$/i, "")
      .replace(/^The\s+/i, "")
      .trim();
    if (!cleaned) return "Family";
    const parts = cleaned.split(/\s+/);
    return parts[parts.length - 1] ?? "Family";
  }, [family?.name]);

  return (
    <header className="flex h-[61px] w-full shrink-0 items-center justify-between border-provost-border-subtle border-b bg-white px-4 md:px-6">
      <div className="flex min-w-0 items-center gap-2 md:gap-4">
        <button
          type="button"
          onClick={toggleSidebar}
          className="flex justify-center rounded-lg p-2 transition-colors hover:bg-provost-bg-secondary"
          aria-label="Toggle sidebar"
        >
          <Icon name="menu" size={25} className="text-provost-text-secondary" />
        </button>
        <span className="truncate font-dm-serif text-2xl md:text-[34px]">{familyName}</span>
        <button
          type="button"
          className="hidden rounded-lg p-2 transition-colors hover:bg-provost-bg-secondary md:flex"
          aria-label="Search"
        >
          <svg
            width="20"
            height="20"
            viewBox="0 0 20 20"
            fill="none"
            xmlns="http://www.w3.org/2000/svg"
            aria-hidden="true"
          >
            <path
              d="M15 15L19 19"
              stroke="#6B6B6B"
              strokeWidth="1.5"
              strokeLinecap="round"
              strokeLinejoin="round"
            />
            <path
              d="M17 9C17 4.58172 13.4183 1 9 1C4.58172 1 1 4.58172 1 9C1 13.4183 4.58172 17 9 17C13.4183 17 17 13.4183 17 9Z"
              stroke="#6B6B6B"
              strokeWidth="1.5"
              strokeLinecap="round"
              strokeLinejoin="round"
            />
          </svg>
        </button>
        {crumbs.length > 0 && (
          <nav
            aria-label="Breadcrumb"
            className="hidden min-w-0 items-center font-light text-[15px] text-provost-text-secondary md:flex"
          >
            {crumbs.map((crumb, idx) => {
              const last = idx === crumbs.length - 1;
              return (
                <Fragment key={`${crumb.href ?? crumb.label}-${idx}`}>
                  {idx > 0 && <span className="mx-1">/</span>}
                  {last || !crumb.href ? (
                    <span className="flex items-center truncate">{crumb.label}</span>
                  ) : (
                    <Link
                      href={crumb.href}
                      className="flex items-center truncate transition-colors hover:text-provost-text-primary"
                    >
                      {crumb.label}
                    </Link>
                  )}
                </Fragment>
              );
            })}
          </nav>
        )}
      </div>

      <div className="flex shrink-0 items-center gap-1 md:gap-2">
        <button
          type="button"
          className="rounded-lg p-2 transition-colors hover:bg-provost-bg-secondary"
          aria-label="Notifications"
        >
          <Icon name="notifications" size={30} className="text-provost-text-secondary" />
        </button>

        <UserMenu />

        <div className="mx-2 hidden h-[31px] w-px bg-provost-border-subtle md:block" />

        {isFullScreen ? (
          // Full-screen chat is active. Per PRD: header shows non-clickable
          // "Chatting…" label and the floating-rail / open-chat affordances
          // are suppressed.
          <span
            className="hidden items-center px-2 text-[14px] text-provost-text-secondary tracking-[-0.42px] md:flex"
            aria-live="polite"
          >
            Chatting…
          </span>
        ) : (
          <button
            type="button"
            onClick={() => setChatPanelOpen(!isChatPanelOpen)}
            className={`hidden items-center rounded-lg p-2 transition-colors md:flex ${
              isChatPanelOpen ? "bg-provost-bg-secondary" : "hover:bg-provost-bg-secondary"
            }`}
            aria-label={isChatPanelOpen ? "Close assistant" : "Open assistant"}
            aria-expanded={isChatPanelOpen}
          >
            <Icon name="asterisk" size={30} />
            <Icon
              name="keyboard_arrow_right"
              size={23}
              className={isChatPanelOpen ? "" : "rotate-180"}
            />
          </button>
        )}
      </div>
    </header>
  );
}
