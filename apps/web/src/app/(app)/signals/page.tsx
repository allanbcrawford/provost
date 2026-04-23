"use client";

import { SignalsInbox } from "@/features/signals/inbox";
import { withRoleGuard } from "@/HOCs/with-role-guard";
import { APP_ROLES } from "@/lib/roles";

export default withRoleGuard(
  function SignalsPage() {
    return <SignalsInbox />;
  },
  APP_ROLES.SIGNALS as NonNullable<(typeof APP_ROLES)["SIGNALS"]>,
);
