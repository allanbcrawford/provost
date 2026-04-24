"use client";

import { UserButton } from "@clerk/nextjs";
import { Icon } from "@provost/ui";
import { useSidebar } from "@/context/sidebar-context";

export function AdminHeader() {
  const { toggle: toggleSidebar } = useSidebar();

  return (
    <header className="w-full h-[61px] flex items-center justify-between px-4 md:px-6 border-b border-provost-border-subtle bg-white shrink-0">
      <div className="flex items-center gap-2 md:gap-4 min-w-0">
        <button
          type="button"
          onClick={toggleSidebar}
          className="flex justify-center p-2 hover:bg-provost-bg-secondary rounded-lg transition-colors"
          aria-label="Toggle sidebar"
        >
          <Icon name="menu" size={25} className="text-provost-text-secondary" />
        </button>
        <span className="font-dm-serif text-2xl md:text-[34px] truncate">Provost</span>
        <span className="hidden md:inline rounded-full border border-provost-border-subtle bg-provost-bg-secondary px-2.5 py-0.5 text-[11px] font-medium uppercase tracking-[0.1em] text-provost-text-secondary">
          Admin
        </span>
      </div>

      <div className="flex items-center gap-1 md:gap-2 shrink-0">
        <div className="w-[45px] h-[45px] rounded-full overflow-hidden flex items-center justify-center">
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
