export default function AppShellLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <div className="flex h-full min-h-0 flex-1 flex-col bg-background text-foreground">
      {children}
    </div>
  );
}
