import Navbar from './Navbar';

export default function PageShell({ page, setPage, children }) {
  return (
    <div className="min-h-screen text-ink relative">
      <Navbar page={page} setPage={setPage} />
      <main className="mx-auto max-w-6xl px-4 py-6 sm:py-8">{children}</main>
    </div>
  );
}
