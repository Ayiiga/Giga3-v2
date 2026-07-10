export function SettingsPanelSkeleton({ title }: { title: string }) {
  return (
    <div className="settings-panel-card saas-card space-y-4 rounded-2xl p-5" aria-busy="true" aria-label={`Loading ${title}`}>
      <div className="h-5 w-40 rounded bg-muted/20" />
      <div className="h-10 w-full rounded-xl bg-muted/15" />
      <div className="h-10 w-full rounded-xl bg-muted/15" />
      <div className="h-10 w-32 rounded-lg bg-muted/15" />
    </div>
  );
}
