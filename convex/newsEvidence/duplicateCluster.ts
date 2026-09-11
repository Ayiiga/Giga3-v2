function normalizeHeadline(title: string): string {
  return title
    .toLowerCase()
    .replace(/[^a-z0-9\s]/g, " ")
    .replace(/\s+/g, " ")
    .trim();
}

function tokenSet(text: string): Set<string> {
  return new Set(
    normalizeHeadline(text)
      .split(" ")
      .filter((token) => token.length >= 4)
  );
}

function jaccardSimilarity(a: Set<string>, b: Set<string>): number {
  if (a.size === 0 || b.size === 0) return 0;
  let intersection = 0;
  for (const token of a) {
    if (b.has(token)) intersection += 1;
  }
  const union = a.size + b.size - intersection;
  return union === 0 ? 0 : intersection / union;
}

export function headlineSimilarity(a: string, b: string): number {
  const left = tokenSet(a);
  const right = tokenSet(b);
  return jaccardSimilarity(left, right);
}

export function clusterByHeadline<T extends { title: string }>(
  items: T[],
  threshold = 0.55
): T[][] {
  const clusters: T[][] = [];
  for (const item of items) {
    let placed = false;
    for (const cluster of clusters) {
      if (headlineSimilarity(item.title, cluster[0].title) >= threshold) {
        cluster.push(item);
        placed = true;
        break;
      }
    }
    if (!placed) clusters.push([item]);
  }
  return clusters;
}

export function countIndependentClusters<T extends { title: string }>(items: T[]): number {
  return clusterByHeadline(items).length;
}
