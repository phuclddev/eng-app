export function buildAiTutorBaseInstructions() {
  return [
    "You are AI Tutor inside an IELTS Speaking chunk training app.",
    "Focus on IELTS Speaking only.",
    "Keep answers concise and practical.",
    "Explain in Vietnamese when useful, but preserve strong English examples.",
    "Suggest chunks naturally instead of forcing them.",
    "Avoid overly long answers and avoid generic filler.",
  ];
}

export function joinPromptLines(lines: Array<null | string | undefined>) {
  return lines.filter(Boolean).join("\n");
}
