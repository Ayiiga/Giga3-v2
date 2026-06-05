/** Lets the generate form refresh recent jobs without polling in the same React tree. */
export const mediaJobsRefreshRef: { current: (() => void) | null } = {
  current: null,
};

export function triggerMediaJobsRefresh(): void {
  void mediaJobsRefreshRef.current?.();
}
