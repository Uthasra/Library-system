/**
 * Creates the tables and fills them with a demo library.
 * Run with:  npm run db:setup
 *
 * Safe to run again at any time — it drops everything and rebuilds, so if you
 * make a mess while experimenting you can always start clean.
 */
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { pool, query, insert } from '../src/db.js';

const here = path.dirname(fileURLToPath(import.meta.url));
const DAY = 86_400_000;
const daysFrom = (n) => new Date(Date.now() + n * DAY);

// A fixed pseudo-random sequence, so every setup produces the same library.
let seed = 424242;
const rnd = () => { seed = (seed * 1664525 + 1013904223) % 4294967296; return seed / 4294967296; };
const pick = (a) => a[Math.floor(rnd() * a.length)];
const int = (min, max) => Math.floor(min + rnd() * (max - min + 1));

const CATALOGUE = [
  ['9780262033848', 'Introduction to Algorithms', 'Thomas H. Cormen', 'MIT Press', 2009, '005.1', 'Computing'],
  ['9780132350884', 'Clean Code', 'Robert C. Martin', 'Prentice Hall', 2008, '005.1', 'Computing'],
  ['9780201616224', 'The Pragmatic Programmer', 'Andrew Hunt', 'Addison-Wesley', 1999, '005.1', 'Computing'],
  ['9781449373320', 'Designing Data-Intensive Applications', 'Martin Kleppmann', "O'Reilly", 2017, '005.74', 'Computing'],
  ['9780596007126', 'Head First Design Patterns', 'Eric Freeman', "O'Reilly", 2004, '005.12', 'Computing'],
  ['9780321751041', 'Artificial Intelligence: A Modern Approach', 'Stuart Russell', 'Pearson', 2010, '006.3', 'Computing'],
  ['9780743273565', 'The Great Gatsby', 'F. Scott Fitzgerald', 'Scribner', 1925, '813.52', 'Fiction'],
  ['9780061120084', 'To Kill a Mockingbird', 'Harper Lee', 'Harper Perennial', 1960, '813.54', 'Fiction'],
  ['9780451524935', 'Nineteen Eighty-Four', 'George Orwell', 'Signet Classics', 1949, '823.912', 'Fiction'],
  ['9780141439518', 'Pride and Prejudice', 'Jane Austen', 'Penguin Classics', 1813, '823.7', 'Fiction'],
  ['9780307474278', 'The Road', 'Cormac McCarthy', 'Vintage', 2006, '813.54', 'Fiction'],
  ['9780316769488', 'The Catcher in the Rye', 'J. D. Salinger', 'Little, Brown', 1951, '813.54', 'Fiction'],
  ['9780545010221', 'Harry Potter and the Deathly Hallows', 'J. K. Rowling', 'Scholastic', 2007, '823.914', 'Fiction'],
  ['9780618640157', 'The Lord of the Rings', 'J. R. R. Tolkien', 'Houghton Mifflin', 1954, '823.912', 'Fiction'],
  ['9780553380163', 'A Brief History of Time', 'Stephen Hawking', 'Bantam', 1988, '523.1', 'Science'],
  ['9780198788607', 'The Selfish Gene', 'Richard Dawkins', 'Oxford', 1976, '576.5', 'Science'],
  ['9780393609394', 'Astrophysics for People in a Hurry', 'Neil deGrasse Tyson', 'Norton', 2017, '523.01', 'Science'],
  ['9780062316097', 'Sapiens', 'Yuval Noah Harari', 'Harper', 2011, '909', 'History'],
  ['9780143127741', 'The Silk Roads', 'Peter Frankopan', 'Vintage', 2015, '950', 'History'],
  ['9780679764021', "A People's History", 'Howard Zinn', 'Harper', 1980, '973', 'History'],
  ['9780374533557', 'Thinking, Fast and Slow', 'Daniel Kahneman', 'Farrar', 2011, '153.4', 'Psychology'],
  ['9781400034772', 'The Tipping Point', 'Malcolm Gladwell', 'Back Bay', 2000, '302', 'Sociology'],
  ['9780140449136', 'Meditations', 'Marcus Aurelius', 'Penguin', 180, '188', 'Philosophy'],
  ['9780679783268', 'The Republic', 'Plato', 'Vintage', 380, '184', 'Philosophy'],
  ['9780385472579', "Zen Mind, Beginner's Mind", 'Shunryu Suzuki', 'Weatherhill', 1970, '294.3', 'Philosophy'],
  ['9781594203602', 'The Innovators', 'Walter Isaacson', 'Simon & Schuster', 2014, '621.39', 'Technology'],
];

const NAMES = [
  'Amara Silva', 'Dinesh Perera', 'Nethmi Fernando', 'Kavindu Jayasinghe', 'Sanduni Rathnayake',
  'Tharindu Bandara', 'Ishara Mendis', 'Ruwan Gunasekara', 'Hasini Wickramasinghe', 'Chamod Ekanayake',
  'Piyumi Herath', 'Lakshan De Silva', 'Nadeeka Samarasinghe', 'Osura Weerasinghe', 'Menaka Dias',
  'Sahan Abeysekara', 'Thilini Rajapaksa', 'Buddhika Senanayake', 'Ayesha Karunaratne', 'Nuwan Peiris',
  'Dilini Amarasinghe', 'Kasun Liyanage', 'Rashmi Gunawardena', 'Praveen Kumara', 'Sewwandi Nanayakkara',
];

async function main() {
  console.log('Creating tables…');
  // The driver runs one statement per call, so the file is split on
  // semicolons. Comments are stripped FIRST -- a semicolon inside a comment
  // would otherwise split a statement in half.
  const schema = fs.readFileSync(path.join(here, 'schema.sql'), 'utf8')
    .replace(/--.*$/gm, '');
  for (const statement of schema.split(';')) {
    const sql = statement.trim();
    if (sql) await pool.query(sql);
  }

  // Placeholder hashes. You will replace these with real bcrypt hashes in
  // stage 3, when you build POST /api/auth/login.
  await pool.query(
    `INSERT INTO staff (name, email, password_hash, role) VALUES
       ('Iresha Bandara', 'iresha@athenaeum.lk', 'REPLACE_IN_STAGE_3', 'admin'),
       ('Malith Fonseka', 'malith@athenaeum.lk', 'REPLACE_IN_STAGE_3', 'librarian')`
  );

  await pool.query('INSERT INTO settings (id) VALUES (1)');

  console.log('Adding books and copies…');
  const bookIds = [];
  for (const [isbn, title, author, publisher, year, dewey, category] of CATALOGUE) {
    const bookId = await insert(
      `INSERT INTO books (isbn, title, author, publisher, year, dewey, category, shelf, description, added_at)
       VALUES (?,?,?,?,?,?,?,?,?,?)`,
      [isbn, title, author, publisher, year, dewey, category,
       `${dewey.slice(0, 3)}-${String.fromCharCode(65 + bookIds.length % 6)}`,
       'Held in the main lending collection.',
       daysFrom(-int(30, 900))]
    );
    bookIds.push(bookId);
  }

  const copyIds = [];
  for (const bookId of bookIds) {
    for (let c = 0; c < int(1, 4); c += 1) {
      const copyId = await insert(
        `INSERT INTO copies (book_id, barcode, \`condition\`, acquired_at)
         VALUES (?,?,?,?)`,
        [bookId, `C${String(100001 + copyIds.length).slice(1)}`,
         pick(['good', 'good', 'good', 'fair', 'worn']), daysFrom(-int(30, 1200))]
      );
      copyIds.push(copyId);
    }
  }

  console.log('Registering members…');
  const memberIds = [];
  for (const [i, name] of NAMES.entries()) {
    const memberId = await insert(
      `INSERT INTO members (member_no, name, email, phone, address, membership_type, status, joined_at, expires_at)
       VALUES (?,?,?,?,?,?,?,?,?)`,
      [`M-${1001 + i}`, name,
       `${name.toLowerCase().replace(/[^a-z]+/g, '.')}@example.lk`,
       `07${int(0, 8)} ${int(100, 999)} ${int(1000, 9999)}`,
       `${int(1, 200)} ${pick(['Galle Road', 'Temple Lane', 'Station Road', 'Lake Drive'])}, ${pick(['Colombo', 'Kandy', 'Galle', 'Matara'])}`,
       pick(['standard', 'standard', 'standard', 'student', 'senior']),
       i % 11 === 0 ? 'suspended' : i % 13 === 0 ? 'expired' : 'active',
       daysFrom(-int(20, 1500)), daysFrom(int(-40, 500))]
    );
    memberIds.push(memberId);
  }

  console.log('Creating loan history…');
  const activeMembers = memberIds.filter((_, i) => i % 11 !== 0 && i % 13 !== 0);

  // Loans that have already been returned, some of them late.
  for (let i = 0; i < 90; i += 1) {
    const copyId = pick(copyIds);
    const memberId = pick(activeMembers);
    const issued = -int(30, 400);
    const due = issued + 14;
    const returned = due + int(-12, 9);

    const loanId = await insert(
      `INSERT INTO loans (copy_id, member_id, issued_at, due_at, returned_at, renewals)
       VALUES (?,?,?,?,?,?)`,
      [copyId, memberId, daysFrom(issued), daysFrom(due), daysFrom(returned), int(0, 2)]
    );

    const lateDays = Math.max(0, returned - due);
    if (lateDays > 0) {
      const paid = rnd() > 0.35;
      await pool.query(
        `INSERT INTO fines (loan_id, member_id, amount, days_late, reason, status, created_at, paid_at)
         VALUES (?,?,?,?,?,?,?,?)`,
        [loanId, memberId, lateDays * 20, lateDays, 'Returned after the due date',
         paid ? 'paid' : 'unpaid', daysFrom(returned), paid ? daysFrom(returned + 1) : null]
      );
    }
  }

  // Loans still out. These are the ones the circulation screens work with.
  const out = new Set();
  for (let i = 0; i < 34; i += 1) {
    let copyId = pick(copyIds);
    let guard = 0;
    while (out.has(copyId) && guard < 50) { copyId = pick(copyIds); guard += 1; }
    if (out.has(copyId)) continue;
    out.add(copyId);

    const memberId = pick(activeMembers);
    const issued = -int(1, 30);
    const due = issued + 14;

    const loanId = await insert(
      `INSERT INTO loans (copy_id, member_id, issued_at, due_at, renewals)
       VALUES (?,?,?,?,?)`,
      [copyId, memberId, daysFrom(issued), daysFrom(due), int(0, 1)]
    );
    await query(`UPDATE copies SET status = 'on_loan' WHERE id = ?`, [copyId]);

    if (due < 0) {
      await pool.query(
        `INSERT INTO fines (loan_id, member_id, amount, days_late, reason, status)
         VALUES (?,?,?,?,?,'unpaid')`,
        [loanId, memberId, Math.abs(due) * 20, Math.abs(due), 'Item is overdue and still out']
      );
    }
  }

  // A few copies away for repair, so `status` has more than two values in it.
  // MySQL will not let you UPDATE a table while selecting from it in a
  // subquery, so read the ids first and then update by id.
  const spare = await query(`SELECT id FROM copies WHERE status = 'available' LIMIT 3`);
  for (const row of spare) {
    await query(`UPDATE copies SET status = 'repair' WHERE id = ?`, [row.id]);
  }

  const counts = await query(`
    SELECT (SELECT COUNT(*) FROM books)   AS books,
           (SELECT COUNT(*) FROM copies)  AS copies,
           (SELECT COUNT(*) FROM members) AS members,
           (SELECT COUNT(*) FROM loans)   AS loans,
           (SELECT COUNT(*) FROM fines)   AS fines
  `);

  console.log('\nDone. Your library now holds:');
  console.table(counts[0]);
  await pool.end();
}

main().catch((err) => {
  console.error('\nSetup failed:', err.message);
  process.exit(1);
});
