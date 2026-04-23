"use client";

import { LibraryView } from "@/features/library";
import { withRoleGuard } from "@/HOCs/with-role-guard";
import { APP_ROLES } from "@/lib/roles";

export default withRoleGuard(LibraryView, APP_ROLES.LIBRARY ?? []);
