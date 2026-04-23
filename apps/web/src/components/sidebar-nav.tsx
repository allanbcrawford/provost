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
    <nav className="flex h-full w-60 shrink-0 flex-col border-neutral-200 border-r bg-white">
      <div className="flex h-14 items-center gap-2 border-neutral-200 border-b px-5">
        <Icon name="shield_person" size={22} weight={500} />
        <span className="font-semibold text-neutral-900 text-sm">Provost</span>
      </div>
      <ul className="flex-1 space-y-0.5 overflow-y-auto p-2">
        {items.map((item) => {
          const active = isActive(pathname, item.href);
          return (
            <li key={item.href}>
              <Link
                href={item.href}
                className={[
                  "flex items-center gap-3 rounded-md px-3 py-2 text-sm transition-colors",
                  active
                    ? "bg-neutral-100 font-medium text-neutral-900"
                    : "text-neutral-600 hover:bg-neutral-50 hover:text-neutral-900",
                ].join(" ")}
              >
                <Icon name={item.icon} size={18} weight={active ? 500 : 400} />
                <span>{item.label}</span>
              </Link>
            </li>
          );
        })}
      </ul>
    </nav>
  );
}
