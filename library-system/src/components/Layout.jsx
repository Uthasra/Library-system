import { useState } from 'react';
import { Link, NavLink, Outlet, useNavigate } from 'react-router-dom';
import {
  BookOpen, LayoutDashboard, Library, LogOut, Menu, Receipt, ScanLine,
  Settings, Users, X, ArrowLeftRight,
} from 'lucide-react';
import { useAuth } from '../auth/AuthContext';
import { initials } from '../lib/format';
import { LIVE_ENDPOINTS } from '../lib/mockServer';

const NAV = [
  { to: '/', label: 'Dashboard', icon: LayoutDashboard, end: true },
  { to: '/circulation', label: 'Circulation desk', icon: ScanLine },
  { to: '/loans', label: 'Loans', icon: ArrowLeftRight },
  { to: '/books', label: 'Catalogue', icon: BookOpen },
  { to: '/members', label: 'Members', icon: Users },
  { to: '/fines', label: 'Fines', icon: Receipt },
  { to: '/settings', label: 'Library rules', icon: Settings, adminOnly: true },
];

function NavItems({ onNavigate }) {
  const { isAdmin } = useAuth();
  return (
    <nav className="space-y-0.5">
      {NAV.filter((i) => !i.adminOnly || isAdmin).map(({ to, label, icon: Icon, end }) => (
        <NavLink
          key={to}
          to={to}
          end={end}
          onClick={onNavigate}
          className={({ isActive }) =>
            `flex items-center gap-2.5 rounded-md px-3 py-2 text-[14px] transition-colors ${
              isActive
                ? 'bg-white/12 font-semibold text-white'
                : 'text-ink-200 hover:bg-white/6 hover:text-white'
            }`
          }
        >
          <Icon size={17} strokeWidth={1.75} />
          {label}
        </NavLink>
      ))}
    </nav>
  );
}

/** Shows how much of the backend is your own code yet. */
function BuildProgress() {
  const total = 22;
  const done = LIVE_ENDPOINTS.length;
  const pct = Math.round((done / total) * 100);
  return (
    <div className="rounded-lg bg-white/8 p-3">
      <div className="flex items-baseline justify-between">
        <span className="text-[11px] font-semibold uppercase tracking-[0.08em] text-ink-300">
          Your backend
        </span>
        <span className="data text-[12px] text-white">{done}/{total}</span>
      </div>
      <div className="mt-2 h-1.5 overflow-hidden rounded-full bg-white/15">
        <div
          className="h-full rounded-full bg-[var(--color-due-ok)] transition-all duration-500"
          style={{ width: `${Math.max(pct, done ? 4 : 0)}%` }}
        />
      </div>
      <p className="mt-2 text-[11.5px] leading-snug text-ink-300">
        {done === 0
          ? 'Every endpoint is still mocked.'
          : done === total
            ? 'Every endpoint is running on your code.'
            : `${total - done} endpoints left to build.`}
      </p>
    </div>
  );
}

function SidebarContent({ onNavigate }) {
  return (
    <div className="flex h-full flex-col bg-ink-800 p-4">
      <Link to="/" onClick={onNavigate} className="mb-6 flex items-center gap-2.5 px-1 text-white">
        <Library size={21} strokeWidth={1.75} />
        <div className="leading-tight">
          <div className="font-display text-[16px] font-semibold tracking-tight">Athenaeum</div>
          <div className="text-[11px] text-ink-300">Public Library</div>
        </div>
      </Link>

      <div className="flex-1 overflow-y-auto">
        <NavItems onNavigate={onNavigate} />
      </div>

      <div className="mt-4 space-y-3">
        <BuildProgress />
      </div>
    </div>
  );
}

export default function Layout() {
  const { user, logout } = useAuth();
  const navigate = useNavigate();
  const [open, setOpen] = useState(false);

  return (
    <div className="flex min-h-screen">
      <aside className="fixed inset-y-0 left-0 hidden w-60 lg:block">
        <SidebarContent />
      </aside>

      {open && (
        <div className="fixed inset-0 z-50 lg:hidden">
          <div className="absolute inset-0 bg-ink-900/50" onClick={() => setOpen(false)} />
          <aside className="relative h-full w-64">
            <SidebarContent onNavigate={() => setOpen(false)} />
            <button
              onClick={() => setOpen(false)}
              aria-label="Close menu"
              className="absolute -right-11 top-3 rounded-md bg-white p-2 text-ink-700 shadow"
            >
              <X size={17} />
            </button>
          </aside>
        </div>
      )}

      <div className="flex min-w-0 flex-1 flex-col lg:ml-60">
        <header className="sticky top-0 z-30 flex h-14 items-center gap-3 border-b border-shelf bg-paper/85 px-4 backdrop-blur sm:px-6">
          <button
            onClick={() => setOpen(true)}
            aria-label="Open menu"
            className="rounded-md p-1.5 text-ink-600 hover:bg-ink-50 lg:hidden"
          >
            <Menu size={19} />
          </button>

          <div className="flex-1" />

          <div className="flex items-center gap-3">
            <div className="hidden text-right sm:block">
              <div className="text-[13.5px] font-medium leading-tight text-ink-800">{user?.name}</div>
              <div className="text-[11.5px] capitalize text-ink-400">{user?.role}</div>
            </div>
            <div className="grid h-8 w-8 place-items-center rounded-full bg-ink-800 text-[12px] font-semibold text-white">
              {initials(user?.name)}
            </div>
            <button
              onClick={() => { logout(); navigate('/login'); }}
              aria-label="Sign out"
              className="rounded-md p-1.5 text-ink-400 hover:bg-ink-50 hover:text-ink-800"
            >
              <LogOut size={17} />
            </button>
          </div>
        </header>

        <main className="flex-1 px-4 py-6 sm:px-6 lg:px-8">
          <Outlet />
        </main>
      </div>
    </div>
  );
}
