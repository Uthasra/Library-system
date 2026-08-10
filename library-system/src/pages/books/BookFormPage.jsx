import { useEffect, useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import api from '../../lib/api';
import { useApi } from '../../lib/useApi';
import { Button, ErrorNote, Field, Input, PageHeader, Select, Spine, Textarea } from '../../components/ui';
import { DEWEY_RANGES } from '../../lib/format';

const CATEGORIES = ['Computing', 'Fiction', 'Science', 'History', 'Philosophy', 'Psychology', 'Sociology', 'Technology'];

const EMPTY = {
  title: '', author: '', isbn: '', publisher: '', year: '',
  dewey: '', category: 'Fiction', shelf: '', description: '',
};

export default function BookFormPage() {
  const { id } = useParams();
  const isNew = !id;
  const navigate = useNavigate();

  const { data: existing, loading } = useApi(
    () => (isNew ? Promise.resolve(null) : api.books.get(id)), [id]
  );

  const [form, setForm] = useState(EMPTY);
  const [errors, setErrors] = useState({});
  const [error, setError] = useState(null);
  const [busy, setBusy] = useState(false);

  useEffect(() => { if (existing) setForm({ ...EMPTY, ...existing }); }, [existing]);

  const set = (key) => (e) => setForm((f) => ({ ...f, [key]: e.target.value }));

  const submit = async (e) => {
    e.preventDefault();
    setBusy(true); setError(null); setErrors({});
    try {
      const saved = isNew
        ? await api.books.create(form)
        : await api.books.update(id, form);
      navigate(`/books/${saved.id}`);
    } catch (err) {
      setError(err);
      if (err.fields) setErrors(err.fields);
      setBusy(false);
    }
  };

  if (loading) return <div className="h-48 animate-pulse rounded-lg border border-shelf bg-white" />;

  return (
    <form onSubmit={submit} className="max-w-3xl">
      <PageHeader
        breadcrumb={[
          { label: 'Catalogue', to: '/books' },
          ...(isNew ? [{ label: 'Add a book' }] : [{ label: existing?.title, to: `/books/${id}` }, { label: 'Edit' }]),
        ]}
        title={isNew ? 'Add a book' : 'Edit book'}
        description={isNew ? 'Cataloguing a new title also creates its first copy, ready to shelve.' : null}
        actions={
          <>
            <Button type="button" variant="secondary" onClick={() => navigate(-1)}>Cancel</Button>
            <Button type="submit" loading={busy}>{isNew ? 'Add to catalogue' : 'Save changes'}</Button>
          </>
        }
      />

      {error && !error.fields && <div className="mb-4"><ErrorNote error={error} /></div>}

      <div className="space-y-4 rounded-lg border border-shelf bg-white p-5">
        <Field label="Title" required error={errors.title}>
          <Input value={form.title} onChange={set('title')} error={errors.title} placeholder="Introduction to Algorithms" />
        </Field>

        <div className="grid gap-4 sm:grid-cols-2">
          <Field label="Author" required error={errors.author}>
            <Input value={form.author} onChange={set('author')} error={errors.author} />
          </Field>
          <Field label="ISBN" required error={errors.isbn} hint="13 digits, no dashes">
            <Input mono value={form.isbn} onChange={set('isbn')} error={errors.isbn} placeholder="9780262033848" />
          </Field>
        </div>

        <div className="grid gap-4 sm:grid-cols-3">
          <Field label="Publisher">
            <Input value={form.publisher} onChange={set('publisher')} />
          </Field>
          <Field label="Year">
            <Input type="number" mono value={form.year} onChange={set('year')} />
          </Field>
          <Field label="Category">
            <Select value={form.category} onChange={set('category')}>
              {CATEGORIES.map((c) => <option key={c} value={c}>{c}</option>)}
            </Select>
          </Field>
        </div>

        <div className="grid gap-4 sm:grid-cols-2">
          <Field
            label="Dewey call number"
            hint="Sets the shelf colour used throughout the system"
            error={errors.dewey}
          >
            <div className="flex items-center gap-2">
              <Input mono value={form.dewey} onChange={set('dewey')} placeholder="005.1" />
              {form.dewey && <Spine dewey={form.dewey} />}
            </div>
          </Field>
          <Field label="Shelf location" hint="Where a browser would find it">
            <Input mono value={form.shelf} onChange={set('shelf')} placeholder="005-A" />
          </Field>
        </div>

        <div className="rounded-md bg-ink-50 p-3">
          <p className="text-[11px] font-semibold uppercase tracking-[0.09em] text-ink-400">Dewey ranges</p>
          <div className="mt-2 flex flex-wrap gap-x-4 gap-y-1.5">
            {DEWEY_RANGES.map(([code, label]) => (
              <button
                key={code} type="button"
                onClick={() => setForm((f) => ({ ...f, dewey: code }))}
                className="flex items-center gap-1.5 text-[12px] text-ink-500 hover:text-ink-800"
              >
                <Spine dewey={code} />
                {label}
              </button>
            ))}
          </div>
        </div>

        <Field label="Notes" hint="Anything the desk should know about this title">
          <Textarea rows={3} value={form.description} onChange={set('description')} />
        </Field>
      </div>
    </form>
  );
}
