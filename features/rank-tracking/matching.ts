function normalizeName(value: string) {
  return value
    .normalize("NFKC")
    .toLowerCase()
    .replace(/[\s\u3000・･,，.。'\"「」『』()（）\-ー_]/g, "");
}

export function scoreStoreName(target: string, candidate: string) {
  const normalizedTarget = normalizeName(target);
  const normalizedCandidate = normalizeName(candidate);
  if (!normalizedTarget || !normalizedCandidate) return 0;
  if (normalizedTarget === normalizedCandidate) return 1;
  if (
    normalizedCandidate.includes(normalizedTarget) ||
    normalizedTarget.includes(normalizedCandidate)
  ) {
    return 0.92;
  }

  const targetChars = new Set(normalizedTarget);
  const overlap = [...targetChars].filter((char) => normalizedCandidate.includes(char)).length;
  return overlap / Math.max(targetChars.size, normalizedCandidate.length);
}

export function findBestStoreMatch(target: string, candidates: string[]) {
  return candidates.reduce(
    (best, candidate, index) => {
      const score = scoreStoreName(target, candidate);
      return score > best.score ? { candidate, index, score } : best;
    },
    { candidate: "", index: -1, score: 0 }
  );
}
