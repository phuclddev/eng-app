import { ChunkLibrary } from "@/components/chunks/chunk-library";
import { getChunkLibrary, getTopicOptions } from "@/server/data/chunks";
import { requireApprovedSession } from "@/server/auth";

export default async function ChunkLibraryPage() {
  const session = await requireApprovedSession();
  const [chunks, topics] = await Promise.all([
    getChunkLibrary(session.user.id),
    getTopicOptions(),
  ]);

  return (
    <ChunkLibrary
      chunks={chunks}
      topics={topics}
      canManage={session.user.role === "ADMIN"}
    />
  );
}
