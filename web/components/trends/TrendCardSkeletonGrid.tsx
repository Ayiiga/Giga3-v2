/** Placeholder card grid while client islands hydrate. */
export function TrendCardSkeletonGrid({ count = 6 }: { count?: number }) {
  return (
    <div className="discover-card-grid" aria-hidden>
      {Array.from({ length: count }, (_, index) => (
        <div
          key={index}
          className="saas-card animate-pulse rounded-2xl border border-border p-5"
        >
          <div className="h-4 w-2/3 rounded bg-slate-200" />
          <div className="mt-3 h-3 w-full rounded bg-slate-100" />
          <div className="mt-2 h-3 w-4/5 rounded bg-slate-100" />
        </div>
      ))}
    </div>
  );
}
