export function BlogAuthor({ name }: { name: string }) {
  return (
    <div className="flex items-center gap-3">
      <div
        className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-violet-100 text-sm font-semibold text-violet-700"
        aria-hidden="true"
      >
        G3
      </div>
      <div>
        <p className="text-sm font-semibold text-foreground">{name}</p>
        <p className="text-xs text-muted">Practical guides reviewed against the Giga3 AI product</p>
      </div>
    </div>
  );
}
