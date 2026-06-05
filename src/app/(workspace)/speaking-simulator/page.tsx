import { SpeakingSimulatorView } from "@/components/ai/speaking-simulator-view";
import { isAiTutorConfigured } from "@/lib/env";
import { requireApprovedSession } from "@/server/auth";
import { getSpeakingSimulatorBootstrap } from "@/server/ai/speaking-simulator-service";

export default async function SpeakingSimulatorPage() {
  const session = await requireApprovedSession();
  const bootstrap = await getSpeakingSimulatorBootstrap(session.user.id);

  return (
    <SpeakingSimulatorView
      enabled={isAiTutorConfigured()}
      initialPromptOptions={bootstrap.promptOptions}
      initialSessions={bootstrap.sessions}
    />
  );
}
