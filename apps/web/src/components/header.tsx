"use client";

import { UserButton } from "@clerk/nextjs";
import { Button, Icon } from "@provost/ui";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { useMemo } from "react";
import { useBreadcrumbs } from "@/context/breadcrumb-context";
import { useSelectedFamily } from "@/context/family-context";
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
  if (parts.length === 0) return [{ label: "Home", href: "/" }];
  const crumbs: { label: string; href: string }[] = [{ label: "Home", href: "/" }];
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
  const { isOpen, setIsOpen } = useChatPanel();

  const crumbs = useMemo(() => overrides ?? buildCrumbsFromPath(pathname), [overrides, pathname]);

  const familyName = family?.name ?? "Provost";

  return (
    <header className="flex h-14 shrink-0 items-center gap-4 border-neutral-200 border-b bg-white px-5">
      <nav aria-label="Breadcrumb" className="flex min-w-0 flex-1 items-center gap-2 text-sm">
        <span className="truncate font-medium text-neutral-900">{familyName}</span>
        <span className="text-neutral-300">/</span>
        <ol className="flex min-w-0 items-center gap-1.5 text-neutral-600">
          {crumbs.map((crumb, idx) => {
            const last = idx === crumbs.length - 1;
            return (
              <li key={`${crumb.href ?? crumb.label}-${idx}`} className="flex items-center gap-1.5">
                {idx > 0 && <span className="text-neutral-300">/</span>}
                {last || !crumb.href ? (
                  <span className={last ? "font-medium text-neutral-900" : undefined}>
                    {crumb.label}
                  </span>
                ) : (
                  <Link href={crumb.href} className="hover:text-neutral-900">
                    {crumb.label}
                  </Link>
                )}
              </li>
            );
          })}
        </ol>
      </nav>
      <div className="flex items-center gap-1">
        <Button variant="ghost" size="icon" aria-label="Search">
          <Icon name="search" size={18} />
        </Button>
        <Button variant="ghost" size="icon" aria-label="Notifications">
          <Icon name="notifications" size={18} />
        </Button>
        <Button
          variant={isOpen ? "primary" : "ghost"}
          size="sm"
          onClick={() => setIsOpen(!isOpen)}
          aria-pressed={isOpen}
        >
          <Icon name="chat" size={16} />
          <span className="ml-1.5">Chat</span>
        </Button>
        <div className="ml-2">
          <UserButton />
        </div>
      </div>
    </header>
  );
}
