// Root route. Authed users go to /home (the dashboard); unauthed users go
// to /sign-in. Doing the check server-side avoids a flash of the sign-in
// page before the redirect fires.

import { auth } from "@clerk/nextjs/server";
import { redirect } from "next/navigation";

export default async function RootPage() {
  const { userId } = await auth();
  redirect(userId ? "/home" : "/sign-in");
}
