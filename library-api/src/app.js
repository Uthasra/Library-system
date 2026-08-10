import express from 'express';
import cors from 'cors';
import booksRouter from './routes/books.js';

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
    console.error(err);
    res.status(500).json({ error: 'Something went wrong on the server.' });
  });

  return app;
}
