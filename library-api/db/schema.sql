-- ---------------------------------------------------------------------------
--  Library database  (MySQL / MariaDB — the one that ships with XAMPP)
--
--  Two decisions worth understanding before you read the rest:
--
--  1. `loans` points at a COPY, not at a book. Two people can borrow the same
--     title at once; they cannot borrow the same physical copy. If this
--     pointed at books, you could not tell which copy to expect back.
--
--  2. There is no `status` column on `loans`. Whether a loan is active,
--     overdue or returned is worked out when you read it, from `returned_at`
--     and `due_at`. A stored status would be wrong every night at midnight.
-- ---------------------------------------------------------------------------

-- Child tables first: a table cannot be dropped while another references it.
DROP TABLE IF EXISTS fines;
DROP TABLE IF EXISTS loans;
DROP TABLE IF EXISTS copies;
DROP TABLE IF EXISTS books;
DROP TABLE IF EXISTS members;
DROP TABLE IF EXISTS staff;
DROP TABLE IF EXISTS settings;

CREATE TABLE staff (
  id            INT AUTO_INCREMENT PRIMARY KEY,
  name          VARCHAR(120) NOT NULL,
  email         VARCHAR(160) NOT NULL UNIQUE,
  password_hash VARCHAR(255) NOT NULL,
  role          VARCHAR(20)  NOT NULL DEFAULT 'librarian'
);

CREATE TABLE books (
  id          INT AUTO_INCREMENT PRIMARY KEY,
  isbn        VARCHAR(20)  NOT NULL UNIQUE,
  title       VARCHAR(255) NOT NULL,
  author      VARCHAR(160) NOT NULL,
  publisher   VARCHAR(160),
  year        INT,
  dewey       VARCHAR(20),
  category    VARCHAR(60),
  shelf       VARCHAR(30),
  description TEXT,
  added_at    DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE copies (
  id          INT AUTO_INCREMENT PRIMARY KEY,
  book_id     INT NOT NULL,
  barcode     VARCHAR(30) NOT NULL UNIQUE,
  status      VARCHAR(20) NOT NULL DEFAULT 'available',
  `condition` VARCHAR(20) NOT NULL DEFAULT 'good',
  acquired_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (book_id) REFERENCES books(id) ON DELETE CASCADE
);

CREATE TABLE members (
  id              INT AUTO_INCREMENT PRIMARY KEY,
  member_no       VARCHAR(20)  NOT NULL UNIQUE,
  name            VARCHAR(120) NOT NULL,
  email           VARCHAR(160) NOT NULL UNIQUE,
  phone           VARCHAR(40),
  address         VARCHAR(255),
  membership_type VARCHAR(20) NOT NULL DEFAULT 'standard',
  status          VARCHAR(20) NOT NULL DEFAULT 'active',
  joined_at       DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  expires_at      DATETIME
);

CREATE TABLE loans (
  id          INT AUTO_INCREMENT PRIMARY KEY,
  copy_id     INT NOT NULL,
  member_id   INT NOT NULL,
  issued_at   DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  due_at      DATETIME NOT NULL,
  returned_at DATETIME,
  renewals    INT NOT NULL DEFAULT 0,
  FOREIGN KEY (copy_id)   REFERENCES copies(id),
  FOREIGN KEY (member_id) REFERENCES members(id)
);

CREATE TABLE fines (
  id            INT AUTO_INCREMENT PRIMARY KEY,
  loan_id       INT NOT NULL,
  member_id     INT NOT NULL,
  amount        DECIMAL(10,2) NOT NULL,
  days_late     INT NOT NULL DEFAULT 0,
  reason        VARCHAR(255),
  status        VARCHAR(20) NOT NULL DEFAULT 'unpaid',
  created_at    DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  paid_at       DATETIME,
  waived_reason VARCHAR(255),
  FOREIGN KEY (loan_id)   REFERENCES loans(id),
  FOREIGN KEY (member_id) REFERENCES members(id)
);

CREATE TABLE settings (
  id                       INT PRIMARY KEY DEFAULT 1,
  library_name             VARCHAR(160)  NOT NULL DEFAULT 'Athenaeum Public Library',
  loan_period_days         INT           NOT NULL DEFAULT 14,
  max_books_per_member     INT           NOT NULL DEFAULT 5,
  max_renewals             INT           NOT NULL DEFAULT 2,
  fine_per_day             DECIMAL(10,2) NOT NULL DEFAULT 20,
  currency                 VARCHAR(10)   NOT NULL DEFAULT 'LKR',
  fine_threshold_for_block DECIMAL(10,2) NOT NULL DEFAULT 500,
  CONSTRAINT only_one_row CHECK (id = 1)
);

-- MySQL needs a name for each index; PostgreSQL would generate one for you.
CREATE INDEX idx_copies_book    ON copies (book_id);
CREATE INDEX idx_copies_status  ON copies (status);
CREATE INDEX idx_loans_member   ON loans (member_id);
CREATE INDEX idx_loans_copy     ON loans (copy_id);
CREATE INDEX idx_loans_returned ON loans (returned_at);
CREATE INDEX idx_fines_member   ON fines (member_id, status);
