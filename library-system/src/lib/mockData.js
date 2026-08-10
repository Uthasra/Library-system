/**
 * Demo data for the mock server. Delete this file once your backend serves
 * every endpoint. Deterministic, so a refresh always shows the same library.
 */

let seed = 424242;
const rnd = () => { seed = (seed * 1664525 + 1013904223) % 4294967296; return seed / 4294967296; };
const pick = (a) => a[Math.floor(rnd() * a.length)];
const int = (min, max) => Math.floor(min + rnd() * (max - min + 1));
const DAY = 86400000;
const daysFrom = (n) => new Date(Date.now() + n * DAY).toISOString();

/* ------------------------------------------------------------------ books */

const CATALOGUE = [
  ['9780262033848', 'Introduction to Algorithms', 'Thomas H. Cormen', 'MIT Press', 2009, '005.1', 'Computing'],
  ['9780132350884', 'Clean Code', 'Robert C. Martin', 'Prentice Hall', 2008, '005.1', 'Computing'],
  ['9780201616224', 'The Pragmatic Programmer', 'Andrew Hunt', 'Addison-Wesley', 1999, '005.1', 'Computing'],
  ['9781449373320', 'Designing Data-Intensive Applications', 'Martin Kleppmann', "O'Reilly", 2017, '005.74', 'Computing'],
  ['9780596007126', 'Head First Design Patterns', 'Eric Freeman', "O'Reilly", 2004, '005.12', 'Computing'],
  ['9780743273565', 'The Great Gatsby', 'F. Scott Fitzgerald', 'Scribner', 1925, '813.52', 'Fiction'],
  ['9780061120084', 'To Kill a Mockingbird', 'Harper Lee', 'Harper Perennial', 1960, '813.54', 'Fiction'],
  ['9780451524935', 'Nineteen Eighty-Four', 'George Orwell', 'Signet Classics', 1949, '823.912', 'Fiction'],
  ['9780141439518', 'Pride and Prejudice', 'Jane Austen', 'Penguin Classics', 1813, '823.7', 'Fiction'],
  ['9780307474278', 'The Road', 'Cormac McCarthy', 'Vintage', 2006, '813.54', 'Fiction'],
  ['9780553380163', 'A Brief History of Time', 'Stephen Hawking', 'Bantam', 1988, '523.1', 'Science'],
  ['9780198788607', 'The Selfish Gene', 'Richard Dawkins', 'Oxford', 1976, '576.5', 'Science'],
  ['9780393609394', 'Astrophysics for People in a Hurry', 'Neil deGrasse Tyson', 'Norton', 2017, '523.01', 'Science'],
  ['9780062316097', 'Sapiens', 'Yuval Noah Harari', 'Harper', 2011, '909', 'History'],
  ['9780143127741', 'The Silk Roads', 'Peter Frankopan', 'Vintage', 2015, '950', 'History'],
  ['9780679764021', 'A People\u2019s History', 'Howard Zinn', 'Harper', 1980, '973', 'History'],
  ['9780374533557', 'Thinking, Fast and Slow', 'Daniel Kahneman', 'Farrar', 2011, '153.4', 'Psychology'],
  ['9781400034772', 'The Tipping Point', 'Malcolm Gladwell', 'Back Bay', 2000, '302', 'Sociology'],
  ['9780140449136', 'Meditations', 'Marcus Aurelius', 'Penguin', 180, '188', 'Philosophy'],
  ['9780679783268', 'The Republic', 'Plato', 'Vintage', -380, '184', 'Philosophy'],
  ['9780316769488', 'The Catcher in the Rye', 'J. D. Salinger', 'Little, Brown', 1951, '813.54', 'Fiction'],
  ['9780545010221', 'Harry Potter and the Deathly Hallows', 'J. K. Rowling', 'Scholastic', 2007, '823.914', 'Fiction'],
  ['9780618640157', 'The Lord of the Rings', 'J. R. R. Tolkien', 'Houghton Mifflin', 1954, '823.912', 'Fiction'],
  ['9780385472579', 'Zen Mind, Beginner\u2019s Mind', 'Shunryu Suzuki', 'Weatherhill', 1970, '294.3', 'Philosophy'],
  ['9781594203602', 'The Innovators', 'Walter Isaacson', 'Simon & Schuster', 2014, '621.39', 'Technology'],
  ['9780321751041', 'Artificial Intelligence: A Modern Approach', 'Stuart Russell', 'Pearson', 2010, '006.3', 'Computing'],
];

export const books = CATALOGUE.map(([isbn, title, author, publisher, year, dewey, category], i) => ({
  id: i + 1,
  isbn,
  title,
  author,
  publisher,
  year,
  dewey,
  category,
  shelf: `${dewey.slice(0, 3)}-${String.fromCharCode(65 + (i % 6))}`,
  description:
    'Held in the main lending collection. Reference queries about this title can be directed to the enquiries desk.',
  addedAt: daysFrom(-int(30, 900)),
}));

/* ------------------------------------------------------- copies (physical) */

export const copies = [];
let copyId = 1;
books.forEach((book) => {
  const n = int(1, 4);
  for (let c = 0; c < n; c += 1) {
    copies.push({
      id: copyId,
      bookId: book.id,
      barcode: `C${String(100000 + copyId).slice(1)}`,
      status: 'available',            // set properly once loans are generated
      condition: pick(['good', 'good', 'good', 'fair', 'worn']),
      acquiredAt: daysFrom(-int(30, 1200)),
    });
    copyId += 1;
  }
});

/* ---------------------------------------------------------------- members */

const NAMES = [
  'Amara Silva', 'Dinesh Perera', 'Nethmi Fernando', 'Kavindu Jayasinghe', 'Sanduni Rathnayake',
  'Tharindu Bandara', 'Ishara Mendis', 'Ruwan Gunasekara', 'Hasini Wickramasinghe', 'Chamod Ekanayake',
  'Piyumi Herath', 'Lakshan De Silva', 'Nadeeka Samarasinghe', 'Osura Weerasinghe', 'Menaka Dias',
  'Sahan Abeysekara', 'Thilini Rajapaksa', 'Buddhika Senanayake', 'Ayesha Karunaratne', 'Nuwan Peiris',
  'Dilini Amarasinghe', 'Kasun Liyanage', 'Rashmi Gunawardena', 'Praveen Kumara', 'Sewwandi Nanayakkara',
];

export const members = NAMES.map((name, i) => {
  const joined = daysFrom(-int(20, 1500));
  return {
    id: i + 1,
    memberNo: `M-${String(1001 + i)}`,
    name,
    email: `${name.toLowerCase().replace(/[^a-z]+/g, '.')}@example.lk`,
    phone: `07${int(0, 8)} ${int(100, 999)} ${int(1000, 9999)}`,
    address: `${int(1, 200)} ${pick(['Galle Road', 'Temple Lane', 'Station Road', 'Lake Drive', 'Hill Street'])}, ${pick(['Colombo', 'Kandy', 'Galle', 'Negombo', 'Matara'])}`,
    membershipType: pick(['standard', 'standard', 'standard', 'student', 'senior']),
    status: i % 11 === 0 ? 'suspended' : i % 13 === 0 ? 'expired' : 'active',
    joinedAt: joined,
    expiresAt: daysFrom(int(-40, 500)),
  };
});

/* ------------------------------------------------------------------ loans */

export const loans = [];
export const fines = [];
let loanId = 1;
let fineId = 1;

const activeMembers = members.filter((m) => m.status === 'active');

// Past, returned loans.
for (let i = 0; i < 90; i += 1) {
  const copy = pick(copies);
  const member = pick(activeMembers);
  const issued = -int(30, 400);
  const due = issued + 14;
  const returned = due + int(-12, 9);
  const lateDays = Math.max(0, returned - due);

  loans.push({
    id: loanId,
    copyId: copy.id,
    bookId: copy.bookId,
    memberId: member.id,
    issuedAt: daysFrom(issued),
    dueAt: daysFrom(due),
    returnedAt: daysFrom(returned),
    renewals: int(0, 2),
    status: 'returned',
  });

  if (lateDays > 0) {
    fines.push({
      id: fineId++,
      loanId,
      memberId: member.id,
      amount: lateDays * 20,
      daysLate: lateDays,
      reason: 'Returned after the due date',
      status: rnd() > 0.35 ? 'paid' : 'unpaid',
      createdAt: daysFrom(returned),
      paidAt: rnd() > 0.35 ? daysFrom(returned + 1) : null,
    });
  }
  loanId += 1;
}

// Loans still out, including a few overdue.
const onLoanCopies = [];
for (let i = 0; i < 34; i += 1) {
  let copy = pick(copies);
  let guard = 0;
  while (onLoanCopies.includes(copy.id) && guard < 50) { copy = pick(copies); guard += 1; }
  if (onLoanCopies.includes(copy.id)) continue;
  onLoanCopies.push(copy.id);

  const member = pick(activeMembers);
  const issued = -int(1, 30);
  const due = issued + 14;

  loans.push({
    id: loanId,
    copyId: copy.id,
    bookId: copy.bookId,
    memberId: member.id,
    issuedAt: daysFrom(issued),
    dueAt: daysFrom(due),
    returnedAt: null,
    renewals: int(0, 1),
    status: due < 0 ? 'overdue' : 'active',
  });

  copy.status = 'on_loan';

  // An overdue item accrues a fine that grows until it comes back.
  if (due < 0) {
    fines.push({
      id: fineId++,
      loanId,
      memberId: member.id,
      amount: Math.abs(due) * 20,
      daysLate: Math.abs(due),
      reason: 'Item is overdue and still out',
      status: 'unpaid',
      createdAt: daysFrom(0),
      paidAt: null,
    });
  }
  loanId += 1;
}

// A handful of copies away for repair, so the status vocabulary is exercised.
copies.filter((c) => c.status === 'available').slice(0, 3).forEach((c) => { c.status = 'repair'; });

/* ------------------------------------------------------------------ staff */

export const staff = [
  { id: 1, name: 'Iresha Bandara', email: 'iresha@athenaeum.lk', role: 'admin', password: 'demo1234' },
  { id: 2, name: 'Malith Fonseka', email: 'malith@athenaeum.lk', role: 'librarian', password: 'demo1234' },
];

/* --------------------------------------------------------------- settings */

export const settings = {
  loanPeriodDays: 14,
  maxBooksPerMember: 5,
  maxRenewals: 2,
  finePerDay: 20,
  currency: 'LKR',
  fineThresholdForBlock: 500,
  libraryName: 'Athenaeum Public Library',
};
