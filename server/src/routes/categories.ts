import { Router, Request, Response } from 'express';
import prisma from '../lib/prisma';
import { requireAuth } from '../middleware/auth';

const router = Router();

async function getStudy(id: number, researcherId: number) {
  return prisma.study.findFirst({ where: { id, researcherId } });
}

// List researcher-defined categories
router.get('/:id/categories', requireAuth, async (req: Request, res: Response) => {
  const studyId = parseInt(req.params.id);
  const study = await getStudy(studyId, req.session.researcherId!);
  if (!study) return res.status(404).json({ error: 'Study not found' });
  const categories = await prisma.category.findMany({
    where: { studyId, sessionId: null },
    orderBy: { createdAt: 'asc' },
  });
  return res.json(categories);
});

// Create researcher category
router.post('/:id/categories', requireAuth, async (req: Request, res: Response) => {
  const studyId = parseInt(req.params.id);
  const study = await getStudy(studyId, req.session.researcherId!);
  if (!study) return res.status(404).json({ error: 'Study not found' });
  const { label } = req.body;
  if (!label) return res.status(400).json({ error: 'label is required' });
  const category = await prisma.category.create({
    data: { studyId, label, sessionId: null },
  });
  return res.status(201).json(category);
});

// Update category
router.put('/:id/categories/:catId', requireAuth, async (req: Request, res: Response) => {
  const studyId = parseInt(req.params.id);
  const catId = parseInt(req.params.catId);
  const study = await getStudy(studyId, req.session.researcherId!);
  if (!study) return res.status(404).json({ error: 'Study not found' });
  const { label } = req.body;
  const category = await prisma.category.update({
    where: { id: catId },
    data: { label },
  });
  return res.json(category);
});

// Delete category
router.delete('/:id/categories/:catId', requireAuth, async (req: Request, res: Response) => {
  const studyId = parseInt(req.params.id);
  const catId = parseInt(req.params.catId);
  const study = await getStudy(studyId, req.session.researcherId!);
  if (!study) return res.status(404).json({ error: 'Study not found' });
  await prisma.category.delete({ where: { id: catId } });
  return res.json({ ok: true });
});

export default router;
