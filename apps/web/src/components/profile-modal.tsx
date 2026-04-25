"use client";

import { Dialog, DialogContent, DialogTitle, StatusChip } from "@provost/ui";

export interface ProfileModalUser {
  firstName: string;
  lastName: string;
  middleName?: string;
  email: string;
  phoneNumber?: string;
  dateOfBirth?: string;
  homeLocation?: string;
  education?: string;
  role?: "admin" | "member";
  onboardingStatus?: "active" | "inactive" | "pending" | "not_onboarded";
  avatarUrl?: string;
}

export interface ProfileModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  user: ProfileModalUser;
}

function initials(first: string, last: string) {
  return `${first.charAt(0)}${last.charAt(0)}`.toUpperCase();
}

function Field({ label, value }: { label: string; value?: string }) {
  if (!value) return null;
  return (
    <div className="flex flex-col gap-1 border-provost-border-subtle border-b py-3 last:border-b-0">
      <span className="font-medium text-[12px] text-provost-text-secondary uppercase tracking-wide">
        {label}
      </span>
      <span className="text-[15px] text-provost-text-primary">{value}</span>
    </div>
  );
}

export function ProfileModal({ open, onOpenChange, user }: ProfileModalProps) {
  const fullName = [user.firstName, user.middleName, user.lastName].filter(Boolean).join(" ");

  const statusVariant =
    user.onboardingStatus === "active"
      ? "active"
      : user.onboardingStatus === "inactive"
        ? "inactive"
        : user.onboardingStatus === "pending"
          ? "pending"
          : undefined;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent>
        <DialogTitle className="sr-only">{fullName} profile</DialogTitle>

        <div className="flex flex-col gap-6 p-6 md:p-8">
          <div className="flex items-center gap-4">
            <div className="relative h-[72px] w-[72px] shrink-0 overflow-hidden rounded-full bg-provost-bg-secondary">
              {user.avatarUrl ? (
                // eslint-disable-next-line @next/next/no-img-element
                <img src={user.avatarUrl} alt={fullName} className="h-full w-full object-cover" />
              ) : (
                <div className="flex h-full w-full items-center justify-center font-medium text-[22px] text-provost-neutral-700">
                  {initials(user.firstName, user.lastName)}
                </div>
              )}
            </div>
            <div className="min-w-0 flex-1">
              <h2 className="truncate font-semibold text-[22px] text-provost-text-primary tracking-[-0.44px]">
                {fullName}
              </h2>
              <div className="mt-2 flex items-center gap-2">
                {user.role ? <StatusChip variant="observation">{user.role}</StatusChip> : null}
                {statusVariant ? (
                  <StatusChip variant={statusVariant}>{user.onboardingStatus}</StatusChip>
                ) : null}
              </div>
            </div>
          </div>

          <div className="flex flex-col">
            <Field label="Email" value={user.email} />
            <Field label="Phone" value={user.phoneNumber} />
            <Field label="Date of birth" value={user.dateOfBirth} />
            <Field label="Home location" value={user.homeLocation} />
            <Field label="Education" value={user.education} />
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
