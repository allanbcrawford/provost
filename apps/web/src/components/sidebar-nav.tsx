"use client";

import { Icon } from "@provost/ui";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { useUserRole } from "@/hooks/use-user-role";
import { APP_ROLES, type Role } from "@/lib/roles";

type NavItem = {
  key: keyof typeof APP_ROLES;
  label: string;
  href: string;
  icon: string;
};

const NAV_ITEMS: NavItem[] = [
  { key: "HOME", label: "Home", href: "/", icon: "home" },
  { key: "FAMILY", label: "Family", href: "/family", icon: "family_restroom" },
  { key: "DOCUMENTS", label: "Documents", href: "/documents", icon: "description" },
  { key: "LIBRARY", label: "Library", href: "/library", icon: "menu_book" },
  { key: "LESSONS", label: "Lessons", href: "/lessons", icon: "school" },
  { key: "SIGNALS", label: "Signals", href: "/signals", icon: "notifications_active" },
  { key: "SIMULATIONS", label: "Simulations", href: "/simulations", icon: "analytics" },
  { key: "PROFESSIONALS", label: "Professionals", href: "/professionals", icon: "groups" },
  { key: "GOVERNANCE", label: "Governance", href: "/governance", icon: "gavel" },
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

  const items = NAV_ITEMS.filter((item) => canSee(role, item.key));

  return (
    <aside className="h-full w-[260px] shrink-0 overflow-hidden border-r border-provost-border-subtle bg-white">
      <nav className="flex h-full flex-col overflow-y-auto pt-6">
        {items.map((item) => {
          const active = isActive(pathname, item.href);
          return (
            <Link
              key={item.href}
              href={item.href}
              className={`flex items-center px-5 py-3 text-[17px] transition-colors hover:bg-provost-bg-menu-hover ${
                active ? "text-provost-text-primary" : "text-provost-neutral-550"
              }`}
            >
              <span className="flex h-6 w-6 items-center justify-center">
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
    </aside>
  );
}
