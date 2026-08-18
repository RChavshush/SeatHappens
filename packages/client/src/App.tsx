import { useEffect, useState } from "react";
import { AdminScreen } from "./admin/AdminScreen";
import { setUnauthorizedHandler } from "./api/authEvents";
import { useAuth } from "./auth/useAuth";
import { AuthScreen } from "./auth/AuthScreen";
import { NotFound } from "./NotFound";
import { MyReservations } from "./screening/MyReservations";
import { ScreeningView } from "./screening/ScreeningView";
import { Icon } from "./ui/Icon";

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
    className={`rounded-md px-3 py-1.5 text-sm font-semibold transition ${
      active ? "bg-white/10 text-white" : "text-neutral-400 hover:text-white"
    }`}
  >
    {children}
  </button>
);

const Wordmark = () => (
  <div className="leading-none">
    <h1 className="text-lg font-bold tracking-tight text-white">
      Seat<span className="text-red">Happens</span>
    </h1>
    <p className="mt-1 text-[10px] font-medium tracking-wide text-neutral-500">
      Seat happens. Pick yours.
    </p>
  </div>
);

const Footer = () => (
  <footer className="mt-10 flex items-center justify-center gap-2 border-t border-hairline px-6 py-8 text-xs text-neutral-600">
    <Icon name="heart" className="h-3.5 w-3.5" strokeWidth={1.6} />
    <span>Made with popcorn and questionable seating decisions.</span>
  </footer>
);

const LoadingScreen = () => (
  <div className="flex min-h-full items-center justify-center" role="status" aria-live="polite">
    <div className="flex items-center gap-3 text-neutral-400">
      <span
        aria-hidden="true"
        className="h-5 w-5 animate-spin rounded-full border-2 border-neutral-700 border-t-red"
      />
      <span className="text-sm">Finding somewhere to put you…</span>
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

  const renderView = () => {
    switch (view) {
      case "book":
        return <ScreeningView />;
      case "admin":
        return <AdminScreen />;
      default:
        return <NotFound onBack={() => setView("book")} />;
    }
  };

  return (
    <div className="flex min-h-full flex-col">
      <header className="sticky top-0 z-30 flex items-center justify-between border-b border-hairline bg-ink/80 px-5 py-3 backdrop-blur">
        <Wordmark />
        <div className="flex items-center gap-3 text-sm">
          <nav className="flex items-center gap-1 rounded-lg border border-hairline p-0.5">
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
            aria-label="Sign out"
            className="flex items-center gap-1.5 rounded-lg border border-hairline px-3 py-1.5 text-neutral-300 transition hover:border-neutral-600 hover:text-white focus:outline-none focus-visible:ring-2 focus-visible:ring-red-soft"
          >
            <Icon name="logout" className="h-4 w-4" />
            <span className="hidden sm:inline">Sign out</span>
          </button>
        </div>
      </header>
      <main className="flex-1 p-4 sm:p-6">{renderView()}</main>
      <Footer />
    </div>
  );
};
