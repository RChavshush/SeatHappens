import { useState } from "react";
import type { FormEvent } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { createMovieRequestSchema, createScreeningRequestSchema } from "@cinema/shared";
import type { Screening } from "@cinema/shared";
import { createMovie, listMovies } from "../api/movies";
import { createScreening, listScreenings } from "../api/screenings";
import { fieldErrors } from "../lib/formErrors";
import { formatRange } from "../movie/format";
import { Poster } from "../movie/Poster";
import { queryKeys } from "../query/keys";
import { useErrorToast, useToasts } from "../toast/ToastContext";
import { TOAST_TONE } from "../toast/tones";
import type { FieldErrors } from "../types";

const NEW_MOVIE = "__new__";

export const AdminScreen = () => {
  const queryClient = useQueryClient();
  const { push } = useToasts();
  const showError = useErrorToast();

  const moviesQuery = useQuery({ queryKey: queryKeys.movies, queryFn: listMovies });
  const screeningsQuery = useQuery({ queryKey: queryKeys.screenings, queryFn: listScreenings });

  const [movieChoice, setMovieChoice] = useState<string>(NEW_MOVIE);
  const [title, setTitle] = useState("");
  const [duration, setDuration] = useState("");
  const [imageUrl, setImageUrl] = useState("");
  const [startsAtLocal, setStartsAtLocal] = useState("");
  const [errors, setErrors] = useState<FieldErrors>({});

  const isNewMovie = movieChoice === NEW_MOVIE;

  const resetForm = () => {
    setTitle("");
    setDuration("");
    setImageUrl("");
    setStartsAtLocal("");
    setErrors({});
  };

  const mutation = useMutation({
    mutationFn: async (): Promise<Screening> => {
      let movieId = movieChoice;
      if (isNewMovie) {
        const movie = await createMovie({
          title,
          durationMinutes: Number(duration),
          imageUrl: imageUrl.trim() === "" ? undefined : imageUrl.trim(),
        });
        movieId = movie.id;
      }
      return createScreening({ movieId, startsAt: new Date(startsAtLocal).toISOString() });
    },
    onSuccess: (screening) => {
      queryClient.invalidateQueries({ queryKey: queryKeys.screenings });
      queryClient.invalidateQueries({ queryKey: queryKeys.movies });
      push(TOAST_TONE.success, `Screening added: ${screening.movieTitle}.`);
      resetForm();
    },
    onError: showError,
  });

  const onSubmit = (event: FormEvent) => {
    event.preventDefault();
    const next: FieldErrors = {};

    if (isNewMovie) {
      const parsed = createMovieRequestSchema.safeParse({
        title,
        durationMinutes: Number(duration),
        imageUrl: imageUrl.trim() === "" ? undefined : imageUrl.trim(),
      });
      if (!parsed.success) Object.assign(next, fieldErrors(parsed.error));
    }

    if (startsAtLocal === "" || Number.isNaN(new Date(startsAtLocal).getTime())) {
      next.startsAt = "Pick a valid start date and time";
    } else {
      const parsed = createScreeningRequestSchema.safeParse({
        movieId: isNewMovie ? "placeholder" : movieChoice,
        startsAt: new Date(startsAtLocal).toISOString(),
      });
      if (!parsed.success) Object.assign(next, fieldErrors(parsed.error));
    }

    if (Object.keys(next).length > 0) {
      setErrors(next);
      return;
    }
    setErrors({});
    mutation.mutate();
  };

  return (
    <div className="mx-auto grid max-w-4xl gap-8 lg:grid-cols-[minmax(0,24rem)_minmax(0,1fr)]">
      <section>
        <h2 className="mb-4 text-lg font-bold tracking-tight text-white">Add a screening</h2>
        <form
          onSubmit={onSubmit}
          noValidate
          className="space-y-4 rounded-2xl border border-hairline bg-panel/80 p-6 shadow-xl shadow-black/40 backdrop-blur"
        >
          <label className="block space-y-1">
            <span className="text-sm text-neutral-300">Movie</span>
            <select
              value={movieChoice}
              onChange={(event) => setMovieChoice(event.target.value)}
              className="w-full rounded-md border border-hairline bg-white/[0.03] px-3 py-2 text-neutral-100 focus:border-red focus:outline-none focus:ring-1 focus:ring-red/60"
            >
              <option value={NEW_MOVIE}>＋ New movie…</option>
              {(moviesQuery.data ?? []).map((movie) => (
                <option key={movie.id} value={movie.id}>
                  {movie.title} ({movie.durationMinutes} min)
                </option>
              ))}
            </select>
          </label>

          {isNewMovie && (
            <>
              <Field label="Title" value={title} error={errors.title} onChange={setTitle} />
              <Field
                label="Duration (minutes)"
                type="number"
                value={duration}
                error={errors.durationMinutes}
                onChange={setDuration}
              />
              <Field
                label="Poster image URL"
                type="url"
                value={imageUrl}
                error={errors.imageUrl}
                onChange={setImageUrl}
              />
            </>
          )}

          <Field
            label="Starts at"
            type="datetime-local"
            value={startsAtLocal}
            error={errors.startsAt}
            onChange={setStartsAtLocal}
          />

          <button
            type="submit"
            disabled={mutation.isPending}
            className="w-full rounded-xl bg-red px-4 py-2.5 font-bold text-white transition hover:bg-red-deep focus:outline-none focus-visible:ring-2 focus-visible:ring-red-soft focus-visible:ring-offset-2 focus-visible:ring-offset-ink disabled:opacity-60"
          >
            {mutation.isPending ? "Adding…" : "Add screening"}
          </button>
        </form>
      </section>

      <section>
        <h2 className="mb-4 text-lg font-bold tracking-tight text-white">Scheduled screenings</h2>
        {screeningsQuery.isPending ? (
          <p className="text-neutral-400">Loading…</p>
        ) : (screeningsQuery.data ?? []).length === 0 ? (
          <p className="text-neutral-400">No screenings yet. The projector is lonely.</p>
        ) : (
          <ul className="space-y-3">
            {(screeningsQuery.data ?? []).map((screening) => (
              <ScreeningRow key={screening.id} screening={screening} />
            ))}
          </ul>
        )}
      </section>
    </div>
  );
};

const ScreeningRow = ({ screening }: { screening: Screening }) => (
  <li className="flex items-center gap-3 rounded-xl border border-hairline bg-white/[0.03] p-3">
    <Poster src={screening.movieImageUrl} alt={screening.movieTitle} className="h-16 w-12" />
    <div className="min-w-0">
      <p className="truncate font-bold text-white">{screening.movieTitle}</p>
      <p className="text-sm text-neutral-400">{formatRange(screening.startsAt, screening.endsAt)}</p>
    </div>
  </li>
);

interface FieldProps {
  label: string;
  type?: string;
  value: string;
  error?: string;
  onChange: (value: string) => void;
}

const Field = ({ label, type = "text", value, error, onChange }: FieldProps) => (
  <label className="block space-y-1">
    <span className="text-sm text-neutral-300">{label}</span>
    <input
      type={type}
      value={value}
      onChange={(event) => onChange(event.target.value)}
      aria-invalid={error ? true : undefined}
      className="w-full rounded-md border border-hairline bg-white/[0.03] px-3 py-2 text-neutral-100 focus:border-red focus:outline-none focus:ring-1 focus:ring-red/60"
    />
    {error && <span className="text-xs text-red-soft">{error}</span>}
  </label>
);
