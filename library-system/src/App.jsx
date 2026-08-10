import { Navigate, Route, Routes } from 'react-router-dom';
import Layout from './components/Layout';
import ProtectedRoute from './auth/ProtectedRoute';
import LoginPage from './auth/LoginPage';
import DashboardPage from './pages/DashboardPage';
import CirculationPage from './pages/circulation/CirculationPage';
import LoansPage from './pages/LoansPage';
import BooksPage from './pages/books/BooksPage';
import BookDetailPage from './pages/books/BookDetailPage';
import BookFormPage from './pages/books/BookFormPage';
import MembersPage from './pages/members/MembersPage';
import MemberDetailPage from './pages/members/MemberDetailPage';
import MemberFormPage from './pages/members/MemberFormPage';
import FinesPage from './pages/FinesPage';
import SettingsPage from './pages/admin/SettingsPage';

export default function App() {
  return (
    <Routes>
      <Route path="/login" element={<LoginPage />} />

      <Route element={<ProtectedRoute><Layout /></ProtectedRoute>}>
        <Route index element={<DashboardPage />} />
        <Route path="circulation" element={<CirculationPage />} />
        <Route path="loans" element={<LoansPage />} />

        <Route path="books" element={<BooksPage />} />
        <Route path="books/new" element={<BookFormPage />} />
        <Route path="books/:id" element={<BookDetailPage />} />
        <Route path="books/:id/edit" element={<BookFormPage />} />

        <Route path="members" element={<MembersPage />} />
        <Route path="members/new" element={<MemberFormPage />} />
        <Route path="members/:id" element={<MemberDetailPage />} />
        <Route path="members/:id/edit" element={<MemberFormPage />} />

        <Route path="fines" element={<FinesPage />} />
        <Route
          path="settings"
          element={<ProtectedRoute adminOnly><SettingsPage /></ProtectedRoute>}
        />
      </Route>

      <Route path="*" element={<Navigate to="/" replace />} />
    </Routes>
  );
}
