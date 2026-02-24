import { Router, Request, Response } from 'express';
import ExcelJS from 'exceljs';
import prisma from '../lib/prisma';
import { requireAuth } from '../middleware/auth';
import { computeSimilarityMatrix, buildDendrogram, extractLeafOrder } from '../services/analysis';

const router = Router();

async function getStudy(id: number, researcherId: number) {
  return prisma.study.findFirst({ where: { id, researcherId } });
}

// Summary: sessions + per-session categories and sort items
router.get('/:id/results/summary', requireAuth, async (req: Request, res: Response) => {
  const studyId = parseInt(req.params.id);
  const study = await getStudy(studyId, req.session.researcherId!);
  if (!study) return res.status(404).json({ error: 'Study not found' });

  const sessions = await prisma.session.findMany({
    where: { studyId, submitted: true },
    include: {
      sortItems: { include: { card: true, category: true } },
      categories: true,
    },
    orderBy: { completedAt: 'asc' },
  });

  return res.json({ sessions });
});

// Exclude / re-include a session
router.patch('/:id/results/sessions/:sessionId', requireAuth, async (req: Request, res: Response) => {
  const studyId = parseInt(req.params.id);
  const sessionId = parseInt(req.params.sessionId);
  const { excluded } = req.body as { excluded: boolean };

  const study = await getStudy(studyId, req.session.researcherId!);
  if (!study) return res.status(404).json({ error: 'Study not found' });

  const updated = await prisma.session.update({
    where: { id: sessionId },
    data: { excluded },
  });
  return res.json(updated);
});

// Similarity matrix
router.get('/:id/results/similarity', requireAuth, async (req: Request, res: Response) => {
  const studyId = parseInt(req.params.id);
  const study = await getStudy(studyId, req.session.researcherId!);
  if (!study) return res.status(404).json({ error: 'Study not found' });

  const result = await computeSimilarityMatrix(studyId);
  return res.json(result);
});

// Clustering / dendrogram
router.get('/:id/results/clustering', requireAuth, async (req: Request, res: Response) => {
  const studyId = parseInt(req.params.id);
  const study = await getStudy(studyId, req.session.researcherId!);
  if (!study) return res.status(404).json({ error: 'Study not found' });

  const { cards, matrix } = await computeSimilarityMatrix(studyId);
  const dendrogram = buildDendrogram(cards, matrix);
  const leafOrder = extractLeafOrder(dendrogram);

  // Reorder matrix by leaf order
  const leafIds = leafOrder.map((id) => id.replace('leaf_', ''));
  const orderedCards = leafIds.map((lid) => cards.find((c) => String(c.id) === lid)!).filter(Boolean);
  const oldIndex = new Map(cards.map((c, i) => [c.id, i]));
  const newOrder = orderedCards.map((c) => oldIndex.get(c.id)!);
  const clusteredMatrix = newOrder.map((r) => newOrder.map((c) => matrix[r][c]));

  return res.json({ dendrogram, cards: orderedCards, clusteredMatrix });
});

// Export JSON
router.get('/:id/results/export/json', requireAuth, async (req: Request, res: Response) => {
  const studyId = parseInt(req.params.id);
  const study = await getStudy(studyId, req.session.researcherId!);
  if (!study) return res.status(404).json({ error: 'Study not found' });

  const sessions = await prisma.session.findMany({
    where: { studyId, submitted: true, excluded: false },
    include: {
      sortItems: { include: { card: true, category: true } },
      categories: true,
    },
  });

  const { cards, matrix } = await computeSimilarityMatrix(studyId);

  res.setHeader('Content-Type', 'application/json');
  res.setHeader('Content-Disposition', `attachment; filename="study-${studyId}-results.json"`);
  return res.json({ study: { id: study.id, title: study.title, type: study.type }, sessions, similarity: { cards, matrix } });
});

// Export Excel
router.get('/:id/results/export/excel', requireAuth, async (req: Request, res: Response) => {
  const studyId = parseInt(req.params.id);
  const study = await getStudy(studyId, req.session.researcherId!);
  if (!study) return res.status(404).json({ error: 'Study not found' });

  const sessions = await prisma.session.findMany({
    where: { studyId, submitted: true, excluded: false },
    include: {
      sortItems: { include: { card: true, category: true } },
    },
  });

  const { cards, matrix } = await computeSimilarityMatrix(studyId);

  const workbook = new ExcelJS.Workbook();

  // Sheet 1: Sort Results
  const sheet1 = workbook.addWorksheet('Sort Results');
  sheet1.addRow(['Participant', 'Card', 'Category']);
  for (const session of sessions) {
    for (const item of session.sortItems) {
      sheet1.addRow([
        session.participantRef,
        item.card.name,
        item.category?.label ?? 'Unsorted',
      ]);
    }
  }

  // Sheet 2: Similarity Matrix
  const sheet2 = workbook.addWorksheet('Similarity Matrix');
  sheet2.addRow(['', ...cards.map((c) => c.name)]);
  for (let i = 0; i < cards.length; i++) {
    sheet2.addRow([cards[i].name, ...matrix[i]]);
  }

  res.setHeader('Content-Type', 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet');
  res.setHeader('Content-Disposition', `attachment; filename="study-${studyId}-results.xlsx"`);
  await workbook.xlsx.write(res);
  return res.end();
});

export default router;
