import { Request, Response, NextFunction } from 'express';

declare module 'express-session' {
  interface SessionData {
    researcherId?: number;
  }
}

export function requireAuth(req: Request, res: Response, next: NextFunction) {
  if (!req.session.researcherId) {
    return res.status(401).json({ error: 'Unauthorized' });
  }
  next();
}
