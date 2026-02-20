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

  let rows: Record<string, string>[];
  try {
    rows = parse(req.file.buffer, {
      columns: true,
      skip_empty_lines: true,
      trim: true,
    });
  } catch {
    return res.status(400).json({ error: 'Invalid CSV file' });
  }

  const cards = rows
    .filter((r) => r.name || r.Name)
    .map((r) => ({
      studyId,
      name: r.name || r.Name,
      description: r.description || r.Description || '',
    }));

  if (cards.length === 0) {
    return res.status(400).json({ error: 'CSV must have a "name" column' });
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
