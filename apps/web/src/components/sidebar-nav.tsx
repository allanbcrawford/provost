"use client";

import { Icon } from "@provost/ui";
import Image from "next/image";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { useSidebar } from "@/context/sidebar-context";
import { useUserRole } from "@/hooks/use-user-role";
import { APP_ROLES, type Role } from "@/lib/roles";

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
