# Athenaeum — Library Management System (frontend)

React + Vite + Tailwind CSS. Built so you can write the backend yourself, one endpoint at a
time, and see each one come alive in the interface.

```bash
npm install
npm run dev        # http://localhost:5173
```

Sign in with `iresha@athenaeum.lk` / `demo1234` (administrator) or
`malith@athenaeum.lk` / `demo1234` (librarian).

## How the two halves fit together

Right now a **mock server** answers every `/api/...` call from demo data, so the whole interface
works before any backend exists. As you build real endpoints you move them across:

```
src/lib/api.js         one function per endpoint — your build list
API_CONTRACT.md        what each one takes and returns, easiest first
src/lib/mockServer.js  the mock — add finished endpoints to LIVE_ENDPOINTS
```

The loop for each endpoint:

1. Pick the next one from `API_CONTRACT.md`.
2. Build it in your backend on `http://localhost:4000`.
3. Add it to `LIVE_ENDPOINTS` in `src/lib/mockServer.js`:

   ```js
   export const LIVE_ENDPOINTS = [
     'GET /api/books',
   ];
   ```

4. Refresh. That call now goes to your server; everything else stays mocked.

The sidebar shows how many of the 22 endpoints are yours. When it reads 22/22, delete
`mockServer.js` and `mockData.js` and remove the `installMockServer()` line from `src/main.jsx`.

Vite proxies `/api` to `localhost:4000` (see `vite.config.js`), so there is no CORS setup and no
API URL in the frontend code. Change the port there if your backend uses a different one.

## Reading the frontend

```
src/
  lib/
    api.js          every network call in the app
    mockServer.js   temporary stand-in for your backend
    mockData.js     demo library — 26 titles, 66 copies, 25 members
    format.js       dates, money, Dewey colours
    useApi.js       useApi() for page loads, useAction() for buttons
  auth/             sign-in, token storage, route guard
  components/
    ui.jsx          Button, Table, Badge, Modal, Field, Spine, and so on
    Layout.jsx      sidebar, header, build progress
  pages/
    DashboardPage.jsx
    circulation/    the issue and return desk
    books/          catalogue list, detail, add and edit
    members/        member list, detail, register and edit
    LoansPage.jsx  FinesPage.jsx  admin/SettingsPage.jsx
```

Every page follows the same shape: `useApi` for loading, `ErrorNote` when it fails,
`EmptyState` when there is nothing, and a `Table` when there is.

## About the design

The obvious direction for a library is antique — cream paper, a literary serif, leather brown.
That is the wrong subject. A librarian at a circulation desk is working in a signage-and-
wayfinding environment: spine labels, shelf-end colours, call numbers, barcodes. So the palette
is cool and civic rather than warm and old, the body typeface is Public Sans (designed for civic
institutions), and identifiers are always monospaced so ISBNs and barcodes line up in a column.

The recurring element is the **spine label**: a call number with a coloured bar, where the colour
encodes the Dewey range. 500s are the same green everywhere in the app, exactly as coloured tape
works on a real shelf. It is a system, not a decoration — which is why it earns its place on
every screen that shows a book.

## What is deliberately not here

No reservations or holds queue, no inter-library loans, no member self-service portal, no email
notifications. The scope is the circulation desk, and it is sized so you can finish the backend.
Those are good things to add once 22/22 is done.
