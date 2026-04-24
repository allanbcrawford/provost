"use client";

import { SignalsInbox } from "@/features/signals/inbox";
import { withRoleGuard } from "@/HOCs/with-role-guard";
import { APP_ROLES } from "@/lib/roles";

export default withRoleGuard(
  function SignalsPage() {
    return (
      <div className="p-8">
        <div className="mb-8">
          <h1 className="font-dm-serif text-[42px] font-medium tracking-[-0.84px] text-provost-text-primary">
            Signals
          </h1>
          <p className="mt-2 text-[14px] tracking-[-0.42px] text-provost-text-secondary">
            Review open signals and observations flagged by the agent.
          </p>
        </div>
        <SignalsInbox />
      </div>
    );
  },
  APP_ROLES.SIGNALS as NonNullable<(typeof APP_ROLES)["SIGNALS"]>,
);
