import { useEffect, useState } from "react";
import { AdminScreen } from "./admin/AdminScreen";
import { setUnauthorizedHandler } from "./api/authEvents";
import { useAuth } from "./auth/useAuth";
import { AuthScreen } from "./auth/AuthScreen";
import { MyReservations } from "./screening/MyReservations";
import { ScreeningView } from "./screening/ScreeningView";

type View = "book" | "admin";

const NavButton = ({
  active,
  onClick,
  children,
}: {
  active: boolean;
  onClick: () => void;
  children: string;
}) => (
  <button
    type="button"
    onClick={onClick}
    aria-current={active ? "page" : undefined}
    className={`rounded-md px-3 py-1 font-semibold transition ${
      active ? "bg-marquee text-black" : "text-neutral-400 hover:text-marquee"
    }`}
  >
    {children}
  </button>
);

const LoadingScreen = () => (
  <div className="flex min-h-full items-center justify-center" role="status" aria-live="polite">
    <div className="flex items-center gap-3 text-neutral-400">
      <span
        aria-hidden="true"
        className="h-5 w-5 animate-spin rounded-full border-2 border-neutral-700 border-t-marquee"
      />
      <span className="text-sm">Loading…</span>
    </div>
  </div>
);

export const App = () => {
  const { user, isLoading, signOut } = useAuth();
  const [view, setView] = useState<View>("book");

  useEffect(() => {
    setUnauthorizedHandler(signOut);
    return () => setUnauthorizedHandler(null);
  }, [signOut]);

  if (isLoading) return <LoadingScreen />;
  if (!user) return <AuthScreen />;

  return (
    <div className="flex min-h-full flex-col">
      <header className="flex items-center justify-between border-b border-neutral-900 bg-black/50 px-5 py-3 backdrop-blur">
        <div className="flex items-center gap-2">
          <span aria-hidden="true" className="text-xl">
            🎬
          </span>
          <div className="leading-tight">
            <h1 className="text-lg font-black uppercase tracking-tight text-white">
              The Corner Cinema
            </h1>
            <p className="text-[0.65rem] font-semibold uppercase tracking-[0.2em] text-marquee">
              Now booking · no bad seats
            </p>
          </div>
        </div>
        <div className="flex items-center gap-3 text-sm">
          <nav className="flex items-center gap-1 rounded-lg border border-neutral-800 p-0.5">
            <NavButton active={view === "book"} onClick={() => setView("book")}>
              Book
            </NavButton>
            <NavButton active={view === "admin"} onClick={() => setView("admin")}>
              Admin
            </NavButton>
          </nav>
          <MyReservations displayName={user.displayName} />
          <button
            type="button"
            onClick={signOut}
            className="rounded-lg border border-neutral-800 px-3 py-1 transition hover:border-marquee hover:text-marquee focus:outline-none focus-visible:ring-2 focus-visible:ring-marquee"
          >
            Sign out
          </button>
        </div>
      </header>
      <main className="flex-1 p-4 sm:p-6">
        {view === "book" ? <ScreeningView /> : <AdminScreen />}
      </main>
    </div>
  );
};
