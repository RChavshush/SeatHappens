interface PosterProps {
  src: string | null;
  alt: string;
  className: string;
}

export const Poster = ({ src, alt, className }: PosterProps) =>
  src ? (
    <img src={src} alt={alt} className={`shrink-0 rounded-md object-cover ${className}`} />
  ) : (
    <div
      aria-hidden="true"
      className={`flex shrink-0 items-center justify-center rounded-md bg-neutral-800 text-neutral-500 ${className}`}
    >
      🎬
    </div>
  );
