# Library API — your backend

Node.js + Express + **MySQL / MariaDB** (the database that comes with XAMPP).

## First-time setup

1. **Start XAMPP** and turn on **MySQL**. Apache is not needed — Node serves the API.

2. **Create the database.** Open http://localhost/phpmyadmin →
   *Databases* → type `library` → *Create*.

   Or from the command line:
   ```bash
   mysql -u root -e "CREATE DATABASE library CHARACTER SET utf8mb4;"
   ```

3. **Check `.env`.** XAMPP's defaults are already filled in:
   ```
   DB_HOST=127.0.0.1
   DB_PORT=3306
   DB_USER=root
   DB_PASSWORD=
   DB_NAME=library
   ```
   Set a password on MySQL? Put it in `DB_PASSWORD`.

4. **Install and build the database:**
   ```bash
   npm install
   npm run db:setup
   ```
   Creates every table and fills it with a demo library. Safe to re-run at any
   time — it drops everything and rebuilds, so you can always start clean.

5. **Start it:**
   ```bash
   npm run dev
   ```

Check it: `curl http://localhost:4000/health` → `{"ok":true}`

Then open phpMyAdmin and click through the tables. Seeing the rows you are
about to query makes the SQL much easier to picture.

## The files

```
db/
  schema.sql   the tables — read the comments at the top
  setup.js     drops everything, rebuilds, fills demo data
src/
  db.js        the connection pool and the query helpers
  app.js       middleware and where routers get mounted
  server.js    starts the server
  routes/
    books.js   ← endpoint 1 lives here
```

## The four helpers in db.js

```js
import { query, queryOne, insert, execute } from './db.js';

const books  = await query('SELECT * FROM books WHERE category = ?', ['Fiction']);
const book   = await queryOne('SELECT * FROM books WHERE id = ?', [5]);
const newId  = await insert('INSERT INTO books (title) VALUES (?)', ['Dune']);
const nRows  = await execute('DELETE FROM books WHERE id = ?', [5]);
```

Always pass values in the array. Never build them into the SQL string.

## The loop

1. Open `API_CONTRACT.md` in the frontend project, pick the next endpoint.
2. Write it here.
3. Test with `curl`.
4. Add it to `LIVE_ENDPOINTS` in the frontend's `src/lib/mockServer.js`.
5. Refresh the browser — that screen is now running on your code.

## If MySQL will not connect

- Is MySQL green in the XAMPP control panel?
- Use `127.0.0.1`, not `localhost`. On some systems `localhost` makes the
  driver try a socket file instead of the network port.
- Port 3306 taken by something else? Change it in XAMPP and in `.env`.
- `Access denied for user 'root'` means `DB_PASSWORD` does not match what
  MySQL expects. In XAMPP it is usually empty.
