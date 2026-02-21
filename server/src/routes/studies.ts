import { Router, Request, Response } from 'express';
import prisma from '../lib/prisma';
import { requireAuth } from '../middleware/auth';

const router = Router();

// List studies for current researcher
router.get('/', requireAuth, async (req: Request, res: Response) => {
  const studies = await prisma.study.findMany({
    where: { researcherId: req.session.researcherId },
    include: {
      _count: { select: { sessions: true, cards: true } },
    },
    orderBy: { createdAt: 'desc' },
  });
  res.json(studies);
});

// Create study
router.post('/', requireAuth, async (req: Request, res: Response) => {
  const { title, description, type, maxParticipants, endsAt, allowUnsorted, instructions } = req.body;
  if (!title || !type) {
    return res.status(400).json({ error: 'title and type are required' });
  }
  const study = await prisma.study.create({
    data: {
      researcherId: req.session.researcherId!,
      title,
      description: description || '',
      type,
      maxParticipants: maxParticipants ? parseInt(maxParticipants) : null,
      endsAt: endsAt ? new Date(endsAt) : null,
      allowUnsorted: allowUnsorted !== false,
      instructions: instructions || '',
    },
  });
  return res.status(201).json(study);
});

// Get single study
router.get('/:id', requireAuth, async (req: Request, res: Response) => {
  const id = parseInt(req.params.id);
  const study = await prisma.study.findFirst({
    where: { id, researcherId: req.session.researcherId },
    include: {
      cards: { orderBy: { createdAt: 'asc' } },
      researcherCategories: { where: { sessionId: null }, orderBy: { createdAt: 'asc' } },
      _count: { select: { sessions: true } },
    },
  });
  if (!study) return res.status(404).json({ error: 'Study not found' });
  return res.json(study);
});

// Update study
router.put('/:id', requireAuth, async (req: Request, res: Response) => {
  const id = parseInt(req.params.id);
  const existing = await prisma.study.findFirst({
    where: { id, researcherId: req.session.researcherId },
  });
  if (!existing) return res.status(404).json({ error: 'Study not found' });

  const { title, description, type, maxParticipants, endsAt, allowUnsorted, instructions } = req.body;
  const study = await prisma.study.update({
    where: { id },
    data: {
      title: title ?? existing.title,
      description: description ?? existing.description,
      type: type ?? existing.type,
      maxParticipants: maxParticipants !== undefined ? (maxParticipants ? parseInt(maxParticipants) : null) : existing.maxParticipants,
      endsAt: endsAt !== undefined ? (endsAt ? new Date(endsAt) : null) : existing.endsAt,
      allowUnsorted: allowUnsorted !== undefined ? allowUnsorted : existing.allowUnsorted,
      instructions: instructions !== undefined ? instructions : existing.instructions,
    },
  });
  return res.json(study);
});

// Delete study
router.delete('/:id', requireAuth, async (req: Request, res: Response) => {
  const id = parseInt(req.params.id);
  const existing = await prisma.study.findFirst({
    where: { id, researcherId: req.session.researcherId },
  });
  if (!existing) return res.status(404).json({ error: 'Study not found' });
  await prisma.study.delete({ where: { id } });
  return res.json({ ok: true });
});

// Publish study
router.post('/:id/publish', requireAuth, async (req: Request, res: Response) => {
  const id = parseInt(req.params.id);
  const existing = await prisma.study.findFirst({
    where: { id, researcherId: req.session.researcherId },
  });
  if (!existing) return res.status(404).json({ error: 'Study not found' });
  const study = await prisma.study.update({
    where: { id },
    data: { status: 'PUBLISHED' },
  });
  return res.json(study);
});

// Close study
router.post('/:id/close', requireAuth, async (req: Request, res: Response) => {
  const id = parseInt(req.params.id);
  const existing = await prisma.study.findFirst({
    where: { id, researcherId: req.session.researcherId },
  });
  if (!existing) return res.status(404).json({ error: 'Study not found' });
  const study = await prisma.study.update({
    where: { id },
    data: { status: 'CLOSED' },
  });
  return res.json(study);
});

export default router;
