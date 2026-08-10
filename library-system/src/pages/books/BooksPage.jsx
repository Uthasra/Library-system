import { useState } from 'react';
import { Link, useNavigate, useSearchParams } from 'react-router-dom';
import { BookOpen, Plus } from 'lucide-react';
import api from '../../lib/api';
import { useApi } from '../../lib/useApi';
import {
  Badge, Button, EmptyState, ErrorNote, PageHeader, Pagination, SearchInput, Select, Spine, Table,
} from '../../components/ui';
import { DEWEY_RANGES } from '../../lib/format';

const CATEGORIES = [
  'Computing', 'Fiction', 'Science', 'History', 'Philosophy',
  'Psychology', 'Sociology', 'Technology',
];

export default function BooksPage() {
  const navigate = useNavigate();
  const [params, setParams] = useSearchParams();
  const [search, setSearch] = useState(params.get('search') ?? '');
  const [category, setCategory] = useState(params.get('category') ?? '');
  const [availability, setAvailability] = useState(params.get('availability') ?? '');
  const [page, setPage] = useState(1);

  const { data, loading, error, reload } = useApi(
    () => api.books.list({ search, category, availability, page }),
    [search, category, availability, page]
  );

  const update = (setter, key) => (value) => {
    setter(value);
    setPage(1);
    const next = new URLSearchParams(params);
    if (value) next.set(key, value); else next.delete(key);
    setParams(next, { replace: true });
  };

  const columns = [
    {
      key: 'title', header: 'Title',
      render: (b) => (
        <div className="flex items-center gap-2.5">
          <Spine dewey={b.dewey} />
          <div className="min-w-0">
            <p className="truncate font-medium text-ink-800">{b.title}</p>
            <p className="truncate text-[12.5px] text-ink-400">{b.author}</p>
          </div>
        </div>
      ),
    },
    { key: 'isbn', header: 'ISBN', hideSm: true, width: 150, render: (b) => <span className="data text-[13px] text-ink-500">{b.isbn}</span> },
    { key: 'category', header: 'Category', hideSm: true, width: 130, render: (b) => <span className="text-ink-500">{b.category}</span> },
    { key: 'year', header: 'Year', hideSm: true, width: 70, align: 'right', render: (b) => <span className="data text-ink-500">{b.year > 0 ? b.year : '—'}</span> },
    {
      key: 'copies', header: 'On shelf', width: 120, align: 'right',
      render: (b) => (
        <Badge tone={b.availableCopies === 0 ? 'late' : b.availableCopies < b.totalCopies ? 'soon' : 'ok'}>
          <span className="data">{b.availableCopies} of {b.totalCopies}</span>
        </Badge>
      ),
    },
  ];

  return (
    <>
      <PageHeader
        eyebrow="Collection"
        title="Catalogue"
        description="Every title held, with how many copies are on the shelf right now."
        actions={<Button icon={Plus} onClick={() => navigate('/books/new')}>Add a book</Button>}
      />

      <div className="mb-4 flex flex-col gap-2 sm:flex-row">
        <SearchInput
          value={search}
          onChange={update(setSearch, 'search')}
          placeholder="Search title, author, ISBN or call number"
          className="sm:max-w-sm sm:flex-1"
        />
        <Select value={category} onChange={(e) => update(setCategory, 'category')(e.target.value)} className="sm:w-44">
          <option value="">All categories</option>
          {CATEGORIES.map((c) => <option key={c} value={c}>{c}</option>)}
        </Select>
        <Select value={availability} onChange={(e) => update(setAvailability, 'availability')(e.target.value)} className="sm:w-44">
          <option value="">Any availability</option>
          <option value="available">On the shelf</option>
          <option value="out">All copies out</option>
        </Select>
      </div>

      {error ? (
        <ErrorNote error={error} onRetry={reload} />
      ) : (
        <>
          <Table
            columns={columns}
            rows={data?.items ?? []}
            loading={loading}
            onRowClick={(b) => navigate(`/books/${b.id}`)}
            empty={
              <EmptyState
                icon={BookOpen}
                title={search || category || availability ? 'No books match those filters' : 'The catalogue is empty'}
                body={
                  search || category || availability
                    ? 'Try a broader search, or clear a filter.'
                    : 'Add the first title and the shelves start filling up.'
                }
                action={<Button icon={Plus} onClick={() => navigate('/books/new')}>Add a book</Button>}
              />
            }
          />
          {data && (
            <Pagination page={data.page} pageSize={data.pageSize} total={data.total} onChange={setPage} />
          )}
        </>
      )}

      <div className="mt-8 rounded-lg border border-shelf bg-white p-4">
        <p className="text-[11px] font-semibold uppercase tracking-[0.09em] text-ink-400">
          Shelf colours
        </p>
        <div className="mt-3 flex flex-wrap gap-x-5 gap-y-2">
          {DEWEY_RANGES.map(([code, label]) => (
            <Link
              key={code}
              to={`/books?search=${code[0]}`}
              className="flex items-center gap-2 text-[12.5px] text-ink-500 hover:text-ink-800"
            >
              <Spine dewey={code} />
              {label}
            </Link>
          ))}
        </div>
      </div>
    </>
  );
}
