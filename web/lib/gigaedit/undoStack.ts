export type UndoStack<T> = {
  past: T[];
  present: T;
  future: T[];
};

export function createUndoStack<T>(initial: T): UndoStack<T> {
  return { past: [], present: initial, future: [] };
}

export function pushUndoState<T>(stack: UndoStack<T>, next: T, maxDepth = 40): UndoStack<T> {
  if (Object.is(stack.present, next)) return stack;
  const past = [...stack.past, stack.present].slice(-maxDepth);
  return { past, present: next, future: [] };
}

export function undoState<T>(stack: UndoStack<T>): UndoStack<T> {
  if (stack.past.length === 0) return stack;
  const previous = stack.past[stack.past.length - 1];
  const past = stack.past.slice(0, -1);
  return { past, present: previous, future: [stack.present, ...stack.future] };
}

export function redoState<T>(stack: UndoStack<T>): UndoStack<T> {
  if (stack.future.length === 0) return stack;
  const [next, ...future] = stack.future;
  return { past: [...stack.past, stack.present], present: next, future };
}

export function canUndo<T>(stack: UndoStack<T>): boolean {
  return stack.past.length > 0;
}

export function canRedo<T>(stack: UndoStack<T>): boolean {
  return stack.future.length > 0;
}
