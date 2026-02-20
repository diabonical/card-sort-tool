import express from 'express';
import session from 'express-session';
import cors from 'cors';
import helmet from 'helmet';
import path from 'path';

import authRouter from './routes/auth';
import studiesRouter from './routes/studies';
import cardsRouter from './routes/cards';
import categoriesRouter from './routes/categories';
import participantRouter from './routes/participant';
import resultsRouter from './routes/results';

const app = express();
const PORT = parseInt(process.env.PORT || '3001', 10);

app.use(helmet({ contentSecurityPolicy: false }));
app.use(cors({ origin: 'http://localhost:5173', credentials: true }));
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

app.use(
  session({
    secret: process.env.SESSION_SECRET || 'dev-secret',
    resave: false,
    saveUninitialized: false,
    cookie: {
      httpOnly: true,
      secure: false, // set true in production with HTTPS
      maxAge: 1000 * 60 * 60 * 24 * 7, // 7 days
    },
  })
);

app.get('/api/health', (_req, res) => {
  res.json({ ok: true });
});

app.use('/api/auth', authRouter);
app.use('/api/studies', studiesRouter);
app.use('/api/studies', cardsRouter);
app.use('/api/studies', categoriesRouter);
app.use('/api/studies', resultsRouter);
app.use('/api/p', participantRouter);

// Error handler
app.use((err: Error, _req: express.Request, res: express.Response, _next: express.NextFunction) => {
  console.error(err);
  res.status(500).json({ error: err.message || 'Internal server error' });
});

app.listen(PORT, () => {
  console.log(`Server running on http://localhost:${PORT}`);
});

export default app;
