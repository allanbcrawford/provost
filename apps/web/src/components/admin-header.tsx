"use client";

import { UserButton } from "@clerk/nextjs";
import { Icon } from "@provost/ui";
import { useSidebar } from "@/context/sidebar-context";

export function AdminHeader() {
  const { toggle: toggleSidebar } = useSidebar();

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
        <span className="truncate font-dm-serif text-2xl md:text-[34px]">Provost</span>
        <span className="hidden rounded-full border border-provost-border-subtle bg-provost-bg-secondary px-2.5 py-0.5 font-medium text-[11px] text-provost-text-secondary uppercase tracking-[0.1em] md:inline">
          Admin
        </span>
      </div>

      <div className="flex shrink-0 items-center gap-1 md:gap-2">
        <div className="flex h-[45px] w-[45px] items-center justify-center overflow-hidden rounded-full">
          <UserButton
            appearance={{
              elements: {
                avatarBox: "w-[45px] h-[45px]",
                userButtonAvatarBox: "w-[45px] h-[45px]",
              },
            }}
          />
        </div>
      </div>
    </header>
  );
}
