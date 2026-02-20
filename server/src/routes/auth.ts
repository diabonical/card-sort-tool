import { Router, Request, Response } from 'express';
import bcrypt from 'bcryptjs';
import prisma from '../lib/prisma';
import { requireAuth } from '../middleware/auth';

const router = Router();

router.post('/login', async (req: Request, res: Response) => {
  const { username, password } = req.body;
  if (!username || !password) {
    return res.status(400).json({ error: 'Username and password required' });
  }

  const researcher = await prisma.researcher.findUnique({ where: { username } });
  if (!researcher) {
    return res.status(401).json({ error: 'Invalid credentials' });
  }

  const valid = await bcrypt.compare(password, researcher.passwordHash);
  if (!valid) {
    return res.status(401).json({ error: 'Invalid credentials' });
  }

  req.session.researcherId = researcher.id;
  return res.json({ id: researcher.id, username: researcher.username });
});

router.post('/logout', (req: Request, res: Response) => {
  req.session.destroy(() => {
    res.clearCookie('connect.sid');
    res.json({ ok: true });
  });
});

router.get('/me', requireAuth, async (req: Request, res: Response) => {
  const researcher = await prisma.researcher.findUnique({
    where: { id: req.session.researcherId },
    select: { id: true, username: true },
  });
  if (!researcher) {
    return res.status(404).json({ error: 'Not found' });
  }
  return res.json(researcher);
});

export default router;
