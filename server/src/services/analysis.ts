import prisma from '../lib/prisma';

export interface SimilarityResult {
  cards: { id: number; name: string }[];
  matrix: number[][];
}

export interface DendrogramNode {
  id: string;
  name?: string;
  height: number;
  children?: DendrogramNode[];
}

export async function computeSimilarityMatrix(studyId: number): Promise<SimilarityResult> {
  const cards = await prisma.card.findMany({
    where: { studyId },
    orderBy: { id: 'asc' },
  });

  const sessions = await prisma.session.findMany({
    where: { studyId, submitted: true, excluded: false },
    include: {
      sortItems: { include: { category: true } },
    },
  });

  const n = cards.length;
  const matrix: number[][] = Array.from({ length: n }, () => Array(n).fill(0));

  if (sessions.length === 0 || n === 0) {
    return { cards: cards.map((c) => ({ id: c.id, name: c.name })), matrix };
  }

  const cardIndex = new Map(cards.map((c, i) => [c.id, i]));

  for (const session of sessions) {
    // Build card → categoryId map for this session (null = unsorted)
    const cardCat = new Map<number, number | null>();
    for (const item of session.sortItems) {
      cardCat.set(item.cardId, item.categoryId);
    }

    // For each pair, check if they're in the same (non-null) category
    for (let i = 0; i < n; i++) {
      for (let j = i + 1; j < n; j++) {
        const ci = cards[i].id;
        const cj = cards[j].id;
        const catI = cardCat.get(ci);
        const catJ = cardCat.get(cj);
        if (catI !== null && catI !== undefined && catI === catJ) {
          matrix[i][j] += 1;
          matrix[j][i] += 1;
        }
      }
    }
  }

  // Normalize by number of sessions
  const total = sessions.length;
  for (let i = 0; i < n; i++) {
    matrix[i][i] = 1;
    for (let j = 0; j < n; j++) {
      if (i !== j) {
        matrix[i][j] = Math.round((matrix[i][j] / total) * 100) / 100;
      }
    }
  }

  return { cards: cards.map((c) => ({ id: c.id, name: c.name })), matrix };
}

// UPGMA hierarchical clustering
export function buildDendrogram(cards: { id: number; name: string }[], matrix: number[][]): DendrogramNode {
  const n = cards.length;

  if (n === 0) {
    return { id: 'empty', name: 'No cards', height: 0 };
  }
  if (n === 1) {
    return { id: `leaf_${cards[0].id}`, name: cards[0].name, height: 0 };
  }

  // Distance matrix: distance = 1 - similarity
  const dist: number[][] = matrix.map((row) => row.map((v) => 1 - v));

  // Initialize clusters
  interface Cluster {
    id: string;
    node: DendrogramNode;
    members: number[]; // indices into original cards array
  }

  let clusters: Cluster[] = cards.map((c, i) => ({
    id: `leaf_${c.id}`,
    node: { id: `leaf_${c.id}`, name: c.name, height: 0 },
    members: [i],
  }));

  // Distance between two clusters (UPGMA = average of all pairwise distances)
  function clusterDist(a: Cluster, b: Cluster): number {
    let sum = 0;
    let count = 0;
    for (const i of a.members) {
      for (const j of b.members) {
        sum += dist[i][j];
        count++;
      }
    }
    return count > 0 ? sum / count : 0;
  }

  let mergeCounter = 0;

  while (clusters.length > 1) {
    // Find closest pair
    let minDist = Infinity;
    let minI = 0;
    let minJ = 1;
    for (let i = 0; i < clusters.length; i++) {
      for (let j = i + 1; j < clusters.length; j++) {
        const d = clusterDist(clusters[i], clusters[j]);
        if (d < minDist) {
          minDist = d;
          minI = i;
          minJ = j;
        }
      }
    }

    const a = clusters[minI];
    const b = clusters[minJ];
    const mergeId = `merge_${mergeCounter++}`;
    const merged: Cluster = {
      id: mergeId,
      node: {
        id: mergeId,
        height: minDist,
        children: [a.node, b.node],
      },
      members: [...a.members, ...b.members],
    };

    // Remove a and b, add merged
    clusters = clusters.filter((_, idx) => idx !== minI && idx !== minJ);
    clusters.push(merged);
  }

  return clusters[0].node;
}

// Extract leaf order from dendrogram for matrix reordering
export function extractLeafOrder(node: DendrogramNode): string[] {
  if (!node.children || node.children.length === 0) {
    return [node.id];
  }
  return node.children.flatMap(extractLeafOrder);
}

function getLeafCardIds(node: DendrogramNode): number[] {
  if (!node.children || node.children.length === 0)
    return [parseInt(node.id.replace('leaf_', ''))];
  return node.children.flatMap(getLeafCardIds);
}

export function cutDendrogramToGroups(
  node: DendrogramNode,
  cards: { id: number; name: string }[],
  threshold: number
): { name: string; cards: { id: number; name: string }[] }[] {
  const cardMap = new Map(cards.map((c) => [c.id, c]));

  function cut(n: DendrogramNode): { id: number; name: string }[][] {
    if (!n.children || n.children.length === 0 || n.height <= threshold) {
      return [getLeafCardIds(n).map((id) => cardMap.get(id)!).filter(Boolean)];
    }
    return n.children.flatMap(cut);
  }

  return cut(node)
    .filter((g) => g.length > 0)
    .map((groupCards, i) => ({ name: `Group ${i + 1}`, cards: groupCards }));
}
