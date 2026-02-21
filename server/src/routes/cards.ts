import { Router, Request, Response } from 'express';
import multer from 'multer';
import { parse } from 'csv-parse/sync';
import prisma from '../lib/prisma';
import { requireAuth } from '../middleware/auth';

const router = Router();
const upload = multer({ storage: multer.memoryStorage() });

async function getStudy(id: number, researcherId: number) {
  return prisma.study.findFirst({ where: { id, researcherId } });
}

// List cards
router.get('/:id/cards', requireAuth, async (req: Request, res: Response) => {
  const studyId = parseInt(req.params.id);
  const study = await getStudy(studyId, req.session.researcherId!);
  if (!study) return res.status(404).json({ error: 'Study not found' });
  const cards = await prisma.card.findMany({
    where: { studyId },
    orderBy: { createdAt: 'asc' },
  });
  return res.json(cards);
});

// Create card
router.post('/:id/cards', requireAuth, async (req: Request, res: Response) => {
  const studyId = parseInt(req.params.id);
  const study = await getStudy(studyId, req.session.researcherId!);
  if (!study) return res.status(404).json({ error: 'Study not found' });
  const { name, description } = req.body;
  if (!name) return res.status(400).json({ error: 'name is required' });
  const card = await prisma.card.create({
    data: { studyId, name, description: description || '' },
  });
  return res.status(201).json(card);
});

// Bulk CSV upload
router.post('/:id/cards/bulk', requireAuth, upload.single('file'), async (req: Request, res: Response) => {
  const studyId = parseInt(req.params.id);
  const study = await getStudy(studyId, req.session.researcherId!);
  if (!study) return res.status(404).json({ error: 'Study not found' });
  if (!req.file) return res.status(400).json({ error: 'No file uploaded' });

  // Parse as raw arrays so we can handle files with or without a header row
  let rawRows: string[][];
  try {
    rawRows = parse(req.file.buffer, {
      columns: false,
      skip_empty_lines: true,
      trim: true,
    });
  } catch {
    return res.status(400).json({ error: 'Invalid CSV file' });
  }

  if (rawRows.length === 0) {
    return res.status(400).json({ error: 'CSV file is empty' });
  }

  // Detect and skip a header row: first cell matches a common column name
  const HEADER_NAMES = new Set(['name', 'card', 'card name', 'term', 'label', 'item', 'title', 'description']);
  const firstCell = (rawRows[0][0] ?? '').toLowerCase().trim();
  const dataRows = HEADER_NAMES.has(firstCell) ? rawRows.slice(1) : rawRows;

  const cards = dataRows
    .map((row) => ({ name: row[0] ?? '', description: row[1] ?? '' }))
    .filter((c) => c.name.length > 0)
    .map((c) => ({ studyId, name: c.name, description: c.description }));

  if (cards.length === 0) {
    return res.status(400).json({ error: 'No cards found in file' });
  }

  await prisma.card.createMany({ data: cards });
  const created = await prisma.card.findMany({
    where: { studyId },
    orderBy: { createdAt: 'asc' },
  });
  return res.status(201).json(created);
});

// Update card
router.put('/:id/cards/:cardId', requireAuth, async (req: Request, res: Response) => {
  const studyId = parseInt(req.params.id);
  const cardId = parseInt(req.params.cardId);
  const study = await getStudy(studyId, req.session.researcherId!);
  if (!study) return res.status(404).json({ error: 'Study not found' });
  const { name, description } = req.body;
  const card = await prisma.card.update({
    where: { id: cardId },
    data: { name, description },
  });
  return res.json(card);
});

// Delete card
router.delete('/:id/cards/:cardId', requireAuth, async (req: Request, res: Response) => {
  const studyId = parseInt(req.params.id);
  const cardId = parseInt(req.params.cardId);
  const study = await getStudy(studyId, req.session.researcherId!);
  if (!study) return res.status(404).json({ error: 'Study not found' });
  await prisma.card.delete({ where: { id: cardId } });
  return res.json({ ok: true });
});

export default router;
