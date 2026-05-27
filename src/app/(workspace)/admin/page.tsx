import { AdminConsole } from "@/components/admin/admin-console";
import { getAdminSnapshot } from "@/server/data/admin";
import { requireAdminSession } from "@/server/auth";

export default async function AdminPage() {
  await requireAdminSession();
  const snapshot = await getAdminSnapshot();

  return <AdminConsole users={snapshot.users} topics={snapshot.topics} />;
}
