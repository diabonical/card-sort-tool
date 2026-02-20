import { Router, Request, Response } from 'express';
import prisma from '../lib/prisma';

const router = Router();

// Get study info by share token
router.get('/:token', async (req: Request, res: Response) => {
  const study = await prisma.study.findUnique({
    where: { shareToken: req.params.token },
    include: {
      cards: { orderBy: { createdAt: 'asc' } },
      researcherCategories: { where: { sessionId: null }, orderBy: { createdAt: 'asc' } },
    },
  });
  if (!study) return res.status(404).json({ error: 'Study not found' });
  if (study.status !== 'PUBLISHED') return res.status(403).json({ error: 'Study is not open' });

  // Check participant limit
  if (study.maxParticipants) {
    const submittedCount = await prisma.session.count({
      where: { studyId: study.id, submitted: true },
    });
    if (submittedCount >= study.maxParticipants) {
      return res.status(403).json({ error: 'Study has reached its participant limit' });
    }
  }

  // Check end date
  if (study.endsAt && new Date() > study.endsAt) {
    return res.status(403).json({ error: 'Study has ended' });
  }

  return res.json({
    id: study.id,
    title: study.title,
    description: study.description,
    type: study.type,
    allowUnsorted: study.allowUnsorted,
    cards: study.cards,
    researcherCategories: study.researcherCategories,
  });
});

// Create session
router.post('/:token/session', async (req: Request, res: Response) => {
  const study = await prisma.study.findUnique({ where: { shareToken: req.params.token } });
  if (!study || study.status !== 'PUBLISHED') {
    return res.status(404).json({ error: 'Study not found or not published' });
  }
  const session = await prisma.session.create({
    data: { studyId: study.id },
  });
  return res.status(201).json({ sessionId: session.id, participantRef: session.participantRef });
});

// Give consent
router.put('/:token/session/:sid/consent', async (req: Request, res: Response) => {
  const sid = parseInt(req.params.sid);
  const session = await prisma.session.findUnique({ where: { id: sid } });
  if (!session) return res.status(404).json({ error: 'Session not found' });
  await prisma.session.update({ where: { id: sid }, data: { consentGiven: true } });
  return res.json({ ok: true });
});

// Start session (record start time)
router.post('/:token/session/:sid/start', async (req: Request, res: Response) => {
  const sid = parseInt(req.params.sid);
  const session = await prisma.session.findUnique({ where: { id: sid } });
  if (!session) return res.status(404).json({ error: 'Session not found' });
  await prisma.session.update({ where: { id: sid }, data: { startedAt: new Date() } });
  return res.json({ ok: true });
});

// Save sort state (full snapshot)
router.put('/:token/session/:sid/sort', async (req: Request, res: Response) => {
  const sid = parseInt(req.params.sid);
  const { sorts, categories } = req.body;
  // sorts: [{ cardId, categoryId? }]
  // categories: [{ id?, label }] — participant-created categories

  const session = await prisma.session.findUnique({
    where: { id: sid },
    include: { study: true },
  });
  if (!session) return res.status(404).json({ error: 'Session not found' });
  if (session.submitted) return res.status(400).json({ error: 'Session already submitted' });

  // Upsert participant categories
  const catMap = new Map<string, number>(); // tempId → real DB id

  if (Array.isArray(categories)) {
    // Delete removed participant categories for this session
    const incomingIds = (categories as Array<{ id?: number; label: string }>)
      .filter((c) => c.id)
      .map((c) => c.id as number);

    await prisma.category.deleteMany({
      where: { sessionId: sid, id: { notIn: incomingIds } },
    });

    for (const cat of categories as Array<{ id?: number; tempId?: string; label: string }>) {
      if (cat.id) {
        await prisma.category.update({ where: { id: cat.id }, data: { label: cat.label } });
        if (cat.tempId) catMap.set(cat.tempId, cat.id);
        catMap.set(String(cat.id), cat.id);
      } else {
        const created = await prisma.category.create({
          data: { studyId: session.studyId, sessionId: sid, label: cat.label },
        });
        if (cat.tempId) catMap.set(cat.tempId, created.id);
      }
    }
  }

  // Upsert sort items
  if (Array.isArray(sorts)) {
    for (const sort of sorts as Array<{ cardId: number; categoryId?: number | string | null }>) {
      let resolvedCatId: number | null = null;
      if (sort.categoryId !== undefined && sort.categoryId !== null) {
        const key = String(sort.categoryId);
        resolvedCatId = catMap.get(key) ?? (typeof sort.categoryId === 'number' ? sort.categoryId : null);
      }
      await prisma.sortItem.upsert({
        where: { sessionId_cardId: { sessionId: sid, cardId: sort.cardId } },
        create: { sessionId: sid, cardId: sort.cardId, categoryId: resolvedCatId },
        update: { categoryId: resolvedCatId },
      });
    }
  }

  return res.json({ ok: true });
});

// Submit session
router.post('/:token/session/:sid/submit', async (req: Request, res: Response) => {
  const sid = parseInt(req.params.sid);
  const session = await prisma.session.findUnique({ where: { id: sid } });
  if (!session) return res.status(404).json({ error: 'Session not found' });
  if (session.submitted) return res.status(400).json({ error: 'Already submitted' });

  const startedAt = session.startedAt ?? new Date();
  const completedAt = new Date();
  const durationSecs = Math.round((completedAt.getTime() - startedAt.getTime()) / 1000);

  await prisma.session.update({
    where: { id: sid },
    data: { submitted: true, completedAt, durationSecs },
  });
  return res.json({ ok: true });
});

export default router;
