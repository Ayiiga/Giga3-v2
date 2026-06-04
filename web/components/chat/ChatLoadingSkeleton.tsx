export function ChatLoadingSkeleton() {
  return (
    <div
      className="flex flex-1 flex-col gap-3 px-4 py-6 sm:px-6"
      role="status"
      aria-label="Loading chat"
      aria-busy="true"
    >
      <div className="mx-auto flex w-full max-w-3xl flex-col gap-3">
        <div className="h-16 w-3/4 rounded-2xl bg-zinc-200" />
        <div className="ml-auto h-14 w-2/3 rounded-2xl bg-zinc-100" />
        <div className="h-20 w-4/5 rounded-2xl bg-zinc-200" />
      </div>
    </div>
  );
}
