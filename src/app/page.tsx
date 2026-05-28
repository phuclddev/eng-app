import { redirect } from "next/navigation";

import { getRootEntryPath } from "@/lib/auth-routing";
import { getAuthSession } from "@/server/auth";

export default async function HomePage() {
  const session = await getAuthSession();
  redirect(getRootEntryPath(session?.user));
}
