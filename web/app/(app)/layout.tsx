export default function AppShellLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <div className="flex h-full min-h-0 min-w-0 max-w-full flex-1 flex-col bg-background text-foreground">
      {children}
    </div>
  );
}
