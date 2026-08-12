import express from 'express';
import cors from 'cors';
import booksRouter from './routes/books.js';
import membersRouter from './routes/members.js';
import loansRouter from './routes/loans.js';
import finesRouter from './routes/fines.js';
import settingsRouter from './routes/settings.js';

export function createApp() {
  const app = express();

  // Lets the frontend on :5173 call this server on :4000.
  app.use(cors());

  // Reads a JSON request body and puts it on req.body.
  // Without this, req.body is undefined on POST and PUT.
  app.use(express.json());

  // Logs every request so you can see what the frontend is actually asking for.
  app.use((req, _res, next) => {
    console.log(`${req.method} ${req.originalUrl}`);
    next();
  });

  app.get('/health', (_req, res) => res.json({ ok: true }));

  // Everything in books.js is mounted under /api/books.
  app.use('/api/books', booksRouter);
  app.use('/api/members', membersRouter);
  app.use('/api/loans', loansRouter);
  app.use('/api/fines', finesRouter);
  app.use('/api/settings', settingsRouter);

  // Nothing matched above, so the path does not exist.
  app.use((req, res) => {
    res.status(404).json({ error: `No route for ${req.method} ${req.path}` });
  });

  /**
   * The error handler. Any error passed to next(err) — or thrown in an async
   * route you wrapped — ends up here, so you never send a raw stack trace to
   * the browser. Express knows this is the error handler because it takes
   * FOUR arguments.
   */
  app.use((err, _req, res, _next) => {
    // Errors we raised on purpose carry a status and a message written for the
    // user, so pass them straight through.
    if (err.status && err.status < 500) {
      return res.status(err.status).json({
        error: err.message,
        ...(err.fields ? { fields: err.fields } : {}),
      });
    }

    // MySQL tells us WHICH unique key was violated, which is far more useful
    // than a generic 500. ER_DUP_ENTRY fires when an ISBN or barcode repeats.
    if (err.code === 'ER_DUP_ENTRY') {
      const field = /isbn/i.test(err.message) ? 'isbn'
        : /barcode/i.test(err.message) ? 'barcode'
        : /email/i.test(err.message) ? 'email'
        : null;
      return res.status(422).json({
        error: 'That value is already used by another record.',
        ...(field ? { fields: { [field]: 'Already in use.' } } : {}),
      });
    }

    // Anything else is a bug. The full trace goes to the terminal; the browser
    // gets a short message so file paths and internals never leak.
    console.error(err);
    res.status(500).json({ error: 'Something went wrong on the server.' });
  });

  return app;
}
