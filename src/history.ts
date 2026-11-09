export type History<T> = { past: T[]; present: T; future: T[] };
export function commitHistory<T>(h: History<T>, next: T): History<T> {
  return JSON.stringify(next) === JSON.stringify(h.present)
    ? h
    : { past: [...h.past, h.present].slice(-80), present: next, future: [] };
}
export function undoHistory<T>(h: History<T>): History<T> {
  return h.past.length
    ? {
        past: h.past.slice(0, -1),
        present: h.past.at(-1)!,
        future: [h.present, ...h.future],
      }
    : h;
}
export function redoHistory<T>(h: History<T>): History<T> {
  return h.future.length
    ? {
        past: [...h.past, h.present].slice(-80),
        present: h.future[0],
        future: h.future.slice(1),
      }
    : h;
}
