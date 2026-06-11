export function stripMarkdownBold(value: string): string {
  if (!value) {
    return value;
  }
  let result = value;
  result = result.replace(/\*\*([\s\S]+?)\*\*/g, "$1");
  result = result.replace(/__([\s\S]+?)__/g, "$1");
  return result;
}

export function stripMarkdownArtifacts(value: string): string {
  if (!value) {
    return value;
  }
  let result = stripMarkdownBold(value);
  result = result.replace(/^[ \t]*[-*+][ \t]+/gm, "");
  result = result.replace(/\*(?=\S)([^*\n]+?)(?<=\S)\*/g, "$1");
  result = result.replace(/_(?=\S)([^_\n]+?)(?<=\S)_/g, "$1");
  return result;
}

export function normalizeAiTextForDisplay(value: string | null | undefined): string {
  if (!value) {
    return "";
  }
  const cleaned = stripMarkdownArtifacts(value);
  return cleaned.replace(/[ \t]+\n/g, "\n").replace(/[ \t]{2,}/g, " ").trim();
}

export function extractBoldPhrases(value: string): string[] {
  if (!value) {
    return [];
  }
  const phrases: string[] = [];
  const seen = new Set<string>();
  const doubleStar = /\*\*([\s\S]+?)\*\*/g;
  const doubleUnderscore = /__([\s\S]+?)__/g;

  for (const match of value.matchAll(doubleStar)) {
    const phrase = match[1].trim();
    if (phrase.length > 0 && !seen.has(phrase.toLowerCase())) {
      seen.add(phrase.toLowerCase());
      phrases.push(phrase);
    }
  }
  for (const match of value.matchAll(doubleUnderscore)) {
    const phrase = match[1].trim();
    if (phrase.length > 0 && !seen.has(phrase.toLowerCase())) {
      seen.add(phrase.toLowerCase());
      phrases.push(phrase);
    }
  }
  return phrases;
}
