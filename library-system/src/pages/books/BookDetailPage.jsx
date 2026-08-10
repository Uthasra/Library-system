import { useState } from 'react';
import { Link, useNavigate, useParams } from 'react-router-dom';
import { Copy, Pencil, Plus, Trash2 } from 'lucide-react';
import api from '../../lib/api';
import { useApi } from '../../lib/useApi';
import {
  Badge, Button, ErrorNote, Field, Input, Modal, PageHeader, Spine, Table, Toast,
  statusLabel, statusTone,
} from '../../components/ui';
import { dueLabel, formatDate } from '../../lib/format';

export default function BookDetailPage() {
  const { id } = useParams();
  const navigate = useNavigate();
  const { data: book, loading, error, reload } = useApi(() => api.books.get(id), [id]);

  const [addOpen, setAddOpen] = useState(false);
  const [deleteOpen, setDeleteOpen] = useState(false);
  const [barcode, setBarcode] = useState('');
  const [busy, setBusy] = useState(false);
  const [formError, setFormError] = useState(null);
  const [toast, setToast] = useState(null);

  const addCopy = async () => {
    setBusy(true); setFormError(null);
    try {
      await api.books.addCopy(id, { barcode: barcode.trim() || undefined });
      setAddOpen(false); setBarcode(''); reload();
      setToast({ message: 'Copy added and shelved.', tone: 'ok' });
    } catch (err) { setFormError(err); } finally { setBusy(false); }
  };

  const removeBook = async () => {
    setBusy(true); setFormError(null);
    try {
      await api.books.remove(id);
      navigate('/books');
    } catch (err) { setFormError(err); setBusy(false); }
  };

  if (loading) return <div className="h-48 animate-pulse rounded-lg border border-shelf bg-white" />;
  if (error) return <><PageHeader title="Book" /><ErrorNote error={error} onRetry={reload} /></>;

  return (
    <>
      <PageHeader
        breadcrumb={[{ label: 'Catalogue', to: '/books' }, { label: book.title }]}
        eyebrow={book.category}
        title={book.title}
        description={`${book.author} · ${book.publisher}${book.year > 0 ? ` · ${book.year}` : ''}`}
        actions={
          <>
            <Button variant="secondary" icon={Pencil} onClick={() => navigate(`/books/${id}/edit`)}>Edit</Button>
            <Button variant="secondary" icon={Plus} onClick={() => setAddOpen(true)}>Add a copy</Button>
            <Button variant="ghost" icon={Trash2} onClick={() => setDeleteOpen(true)}>Remove</Button>
          </>
        }
      />

      <div className="grid gap-4 lg:grid-cols-[1fr_300px]">
        <div className="rounded-lg border border-shelf bg-white">
          <div className="flex items-center justify-between border-b border-shelf px-4 py-3">
            <h2 className="text-[14.5px] font-semibold text-ink-800">
              Copies <span className="data text-ink-400">({book.copies.length})</span>
            </h2>
            <Badge tone={book.availableCopies ? 'ok' : 'late'}>
              <span className="data">{book.availableCopies} on the shelf</span>
            </Badge>
          </div>
          <Table
            columns={[
              { key: 'barcode', header: 'Barcode', width: 120, render: (c) => <span className="data text-[13px] font-medium">{c.barcode}</span> },
              { key: 'status', header: 'Status', width: 110, render: (c) => <Badge tone={statusTone(c.status)}>{statusLabel(c.status)}</Badge> },
              { key: 'condition', header: 'Condition', hideSm: true, width: 100, render: (c) => <span className="capitalize text-ink-500">{c.condition}</span> },
              {
                key: 'with', header: 'With',
                render: (c) => c.currentLoan ? (
                  <Link to={`/members/${c.currentLoan.member?.id}`} className="text-ink-700 hover:underline">
                    {c.currentLoan.member?.name}
                  </Link>
                ) : <span className="text-ink-300">—</span>,
              },
              {
                key: 'due', header: 'Due', align: 'right', width: 150,
                render: (c) => c.currentLoan
                  ? <span className={c.currentLoan.status === 'overdue' ? 'text-[var(--color-due-late)]' : 'text-ink-500'}>
                      {dueLabel(c.currentLoan.dueAt)}
                    </span>
                  : <span className="text-ink-300">—</span>,
              },
            ]}
            rows={book.copies}
            rowKey={(c) => c.id}
          />
        </div>

        <aside className="space-y-3">
          <div className="rounded-lg border border-shelf bg-white p-4">
            <div className="flex items-center gap-2">
              <Spine dewey={book.dewey} />
              <span className="text-[13px] text-ink-400">Call number</span>
            </div>
            <dl className="mt-4 space-y-2.5 border-t border-shelf pt-3">
              {[
                ['ISBN', book.isbn, true],
                ['Shelf', book.shelf, true],
                ['Publisher', book.publisher, false],
                ['Year', book.year > 0 ? book.year : '—', true],
                ['Added', formatDate(book.addedAt), false],
              ].map(([label, value, mono]) => (
                <div key={label} className="flex justify-between gap-3 text-[13px]">
                  <dt className="text-ink-400">{label}</dt>
                  <dd className={`text-right font-medium text-ink-800 ${mono ? 'data' : ''}`}>{value}</dd>
                </div>
              ))}
            </dl>
          </div>
          {book.description && (
            <div className="rounded-lg border border-shelf bg-white p-4">
              <p className="text-[11px] font-semibold uppercase tracking-[0.09em] text-ink-400">Notes</p>
              <p className="mt-2 text-[13.5px] leading-relaxed text-ink-500">{book.description}</p>
            </div>
          )}
        </aside>
      </div>

      <Modal
        open={addOpen} onClose={() => setAddOpen(false)}
        title="Add a copy"
        description="A new physical copy of this title, ready to shelve."
        footer={
          <>
            <Button variant="secondary" onClick={() => setAddOpen(false)}>Cancel</Button>
            <Button onClick={addCopy} loading={busy}>Add copy</Button>
          </>
        }
      >
        <Field label="Barcode" hint="Leave empty and the system assigns the next one.">
          <Input mono value={barcode} onChange={(e) => setBarcode(e.target.value)} placeholder="C00042" />
        </Field>
        {formError && <div className="mt-3"><ErrorNote error={formError} /></div>}
      </Modal>

      <Modal
        open={deleteOpen} onClose={() => setDeleteOpen(false)}
        title="Remove this book?"
        description="This removes the title and all its copies from the catalogue. It cannot be undone."
        footer={
          <>
            <Button variant="secondary" onClick={() => setDeleteOpen(false)}>Keep it</Button>
            <Button variant="danger" onClick={removeBook} loading={busy}>Remove book</Button>
          </>
        }
      >
        <p className="text-[14px] text-ink-500">
          <span className="font-medium text-ink-800">{book.title}</span> has {book.copies.length} copies.
          Any that are still on loan have to come back first.
        </p>
        {formError && <div className="mt-3"><ErrorNote error={formError} /></div>}
      </Modal>

      <Toast toast={toast} onDismiss={() => setToast(null)} />
    </>
  );
}
