"use client";

import { Icon } from "@provost/ui";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { useSidebar } from "@/context/sidebar-context";

type AdminNavItem = {
  label: string;
  href: string;
  icon: string;
};

// Mirrors the family sidebar styling but exposes only site-admin surfaces.
// Future additions (e.g. "Families" roster) land here.
const ADMIN_NAV_ITEMS: AdminNavItem[] = [
  { label: "Library", href: "/library", icon: "auto_stories" },
  { label: "Governance", href: "/governance", icon: "gavel" },
];

function isActive(pathname: string, href: string): boolean {
  return pathname === href || pathname.startsWith(`${href}/`);
}

export function AdminSidebarNav() {
  const pathname = usePathname() ?? "/";
  const { isOpen, isMobile, close } = useSidebar();

  const content = (
    <nav className="flex h-full flex-col overflow-y-auto pt-6">
      <div className="px-5 pb-4 font-semibold text-[11px] text-provost-text-tertiary uppercase tracking-[0.12em]">
        Site admin
      </div>
      {ADMIN_NAV_ITEMS.map((item) => {
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
              <Icon
                name={item.icon}
                size={29}
                weight={200}
                filled={active}
                className={active ? "text-provost-text-primary" : "text-provost-neutral-550"}
              />
            </span>
            <span className="ml-[15px]">{item.label}</span>
          </Link>
        );
      })}
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
