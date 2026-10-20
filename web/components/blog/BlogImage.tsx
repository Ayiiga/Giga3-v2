import Image from "next/image";

export type BlogImageAspect = "16/9" | "16/10" | "4/3" | "3/2";

const ASPECT_CLASS: Record<BlogImageAspect, string> = {
  "16/9": "aspect-[16/9]",
  "16/10": "aspect-[16/10]",
  "4/3": "aspect-[4/3]",
  "3/2": "aspect-[3/2]",
};

type BlogImageProps = {
  src: string;
  alt: string;
  /** Hero / LCP images should set priority. */
  priority?: boolean;
  aspect?: BlogImageAspect;
  sizes?: string;
  className?: string;
  /** Extra classes on the image element (object-fit etc.). */
  imageClassName?: string;
  rounded?: boolean;
};

/**
 * Responsive blog media with reserved aspect ratio (CLS), cover fit,
 * and priority/lazy loading for static-export articles.
 */
export function BlogImage({
  src,
  alt,
  priority = false,
  aspect = "16/9",
  sizes = "(max-width: 768px) 100vw, 768px",
  className = "",
  imageClassName = "object-cover",
  rounded = true,
}: BlogImageProps) {
  return (
    <div
      className={[
        "relative w-full max-w-full overflow-hidden bg-slate-100",
        ASPECT_CLASS[aspect],
        rounded ? "rounded-2xl" : "",
        className,
      ]
        .filter(Boolean)
        .join(" ")}
    >
      <Image
        src={src}
        alt={alt}
        fill
        priority={priority}
        loading={priority ? undefined : "lazy"}
        decoding="async"
        className={imageClassName}
        sizes={sizes}
      />
    </div>
  );
}
