import { Icon } from "./ui/Icon";

interface NotFoundProps {
  onBack: () => void;
}

export const NotFound = ({ onBack }: NotFoundProps) => (
  <div className="flex min-h-[60vh] flex-col items-center justify-center gap-4 text-center">
    <Icon name="film" className="h-10 w-10 text-neutral-600" strokeWidth={1.4} />
    <h2 className="text-2xl font-bold tracking-tight text-white">
      This page left during the trailers.
    </h2>
    <p className="max-w-sm text-sm text-neutral-400">
      We looked under every seat. It's not here. Let's get you back to something that exists.
    </p>
    <button
      type="button"
      onClick={onBack}
      className="mt-2 inline-flex items-center gap-2 rounded-lg bg-red px-5 py-2.5 text-sm font-bold text-white transition hover:bg-red-deep focus:outline-none focus-visible:ring-2 focus-visible:ring-red-soft focus-visible:ring-offset-2 focus-visible:ring-offset-ink"
    >
      <Icon name="arrowLeft" className="h-4 w-4" />
      Back to booking
    </button>
  </div>
);
