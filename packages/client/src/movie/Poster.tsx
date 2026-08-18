import { cx } from "../lib/cx";
import { Icon } from "../ui/Icon";

interface PosterProps {
  src: string | null;
  alt: string;
  className: string;
}

export const Poster = ({ src, alt, className }: PosterProps) =>
  src ? (
    <img
      src={src}
      alt={alt}
      loading="lazy"
      className={cx("shrink-0 rounded-lg object-cover ring-1 ring-hairline", className)}
    />
  ) : (
    <div
      aria-hidden="true"
      className={cx(
        "flex shrink-0 items-center justify-center rounded-lg bg-gradient-to-br from-neutral-800 to-neutral-900 text-neutral-600 ring-1 ring-hairline",
        className,
      )}
    >
      <Icon name="film" className="h-1/3 w-1/3" strokeWidth={1.6} />
    </div>
  );
