"use client";

import { useClerk, useUser } from "@clerk/nextjs";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
  Icon,
} from "@provost/ui";
import { useRouter } from "next/navigation";

function initialsFor(name: string | null | undefined, email: string | null | undefined): string {
  const source = (name ?? email ?? "").trim();
  if (!source) return "?";
  const parts = source.split(/\s+/);
  if (parts.length >= 2) {
    return ((parts[0]?.[0] ?? "") + (parts[1]?.[0] ?? "")).toUpperCase();
  }
  return source.slice(0, 2).toUpperCase();
}

export function UserMenu() {
  const router = useRouter();
  const { user, isLoaded } = useUser();
  const { signOut } = useClerk();

  if (!isLoaded || !user) {
    return (
      <div
        className="h-[45px] w-[45px] animate-pulse rounded-full bg-provost-bg-secondary"
        aria-hidden="true"
      />
    );
  }

  const name = user.fullName ?? user.firstName ?? null;
  const email = user.primaryEmailAddress?.emailAddress ?? null;
  const avatar = user.hasImage ? user.imageUrl : null;
  const initials = initialsFor(name, email);

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <button
          type="button"
          aria-label="Open user menu"
          className="flex h-[45px] w-[45px] items-center justify-center overflow-hidden rounded-full border border-provost-border-subtle bg-provost-bg-secondary text-provost-text-primary text-sm font-medium outline-none transition-opacity hover:opacity-90 focus-visible:ring-2 focus-visible:ring-provost-border-default focus-visible:ring-offset-2"
        >
          {avatar ? (
            // biome-ignore lint/performance/noImgElement: Clerk-hosted avatar URL
            <img src={avatar} alt="" className="h-full w-full object-cover" />
          ) : (
            <span aria-hidden="true">{initials}</span>
          )}
        </button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end" sideOffset={8} className="min-w-[260px] p-0">
        <div className="flex items-center gap-3 px-3 py-3">
          <div className="flex h-10 w-10 shrink-0 items-center justify-center overflow-hidden rounded-full border border-provost-border-subtle bg-provost-bg-secondary text-provost-text-primary text-sm font-medium">
            {avatar ? (
              // biome-ignore lint/performance/noImgElement: Clerk-hosted avatar URL
              <img src={avatar} alt="" className="h-full w-full object-cover" />
            ) : (
              <span aria-hidden="true">{initials}</span>
            )}
          </div>
          <div className="min-w-0 flex-1">
            {name && (
              <p className="truncate font-medium text-provost-text-primary text-sm">{name}</p>
            )}
            {email && <p className="truncate text-provost-text-secondary text-xs">{email}</p>}
          </div>
        </div>
        <DropdownMenuSeparator className="mx-0 my-0" />
        <div className="p-1">
          <DropdownMenuItem
            onSelect={(e) => {
              e.preventDefault();
              void signOut(() => router.push("/sign-in"));
            }}
          >
            <Icon name="logout" size={18} className="text-provost-text-secondary" />
            <span>Sign out</span>
          </DropdownMenuItem>
        </div>
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
