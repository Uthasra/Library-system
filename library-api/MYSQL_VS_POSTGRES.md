# MySQL and PostgreSQL — what actually differs

The starter is written for MySQL. Everything you learn here transfers, but the
syntax moves in a few places. Keep this open while you work.

## Things you will hit in this project

| | MySQL / MariaDB | PostgreSQL |
|---|---|---|
| Auto-increment id | `INT AUTO_INCREMENT PRIMARY KEY` | `SERIAL PRIMARY KEY` |
| Query placeholder | `?` | `$1`, `$2`, … |
| Get the new id | `result.insertId` | `INSERT … RETURNING id` |
| Case-insensitive match | `LIKE` (default collation) | `ILIKE` |
| Conditional count | `COUNT(CASE WHEN x THEN 1 END)` | `COUNT(*) FILTER (WHERE x)` |
| Column alias with capitals | `AS addedAt` | `AS "addedAt"` (quotes required) |
| Date and time | `DATETIME` | `TIMESTAMPTZ` |
| Decimal | `DECIMAL(10,2)` | `NUMERIC(10,2)` |
| Text | `VARCHAR(n)` or `TEXT` | `TEXT` (no length needed) |
| Add N days | `DATE_ADD(d, INTERVAL 14 DAY)` | `d + INTERVAL '14 days'` |
| Days between | `DATEDIFF(a, b)` | `(a::date - b::date)` |
| Index needs a name | yes | no |

## Two MySQL rules that catch people out

**You cannot UPDATE a table while selecting from it in a subquery.**

```sql
-- Fails on MySQL
UPDATE copies SET status = 'repair'
WHERE id IN (SELECT id FROM copies WHERE status = 'available' LIMIT 3);
```

Read the ids in one query, then update by id. `db/setup.js` does exactly this,
with a comment marking the spot.

**`condition` is a reserved word.** The column in `copies` has to be written
with backticks:

```sql
SELECT `condition` FROM copies
```

## Placeholders behave differently

PostgreSQL numbers them, so `$1` can appear several times and still take one
value. MySQL does not: every `?` consumes the next item in the array, in
order. If a search term is compared against four columns, push it four times.

```js
const term = `%${search}%`;
const sql = 'SELECT * FROM books WHERE title LIKE ? OR author LIKE ?';
const rows = await query(sql, [term, term]);   // twice
```

## Which should you use later?

Both are excellent and both are everywhere. MySQL is what you have installed,
it has phpMyAdmin for browsing, and it is extremely common in web work.

PostgreSQL has stricter type checking, better JSON support and more powerful
queries — the `FILTER` clause above is a small taste. It is worth learning
after this project, not during it. Do not add a database installation to your
plate while you are also learning Express.
