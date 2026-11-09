import { it, expect, vi } from "vitest";
import { createPageSaver, type SaveStatus } from "./pageSaver";
import {
  recordOf,
  PageStorageError,
  type PageRecord,
  type Token,
} from "./pageStorage";
import { createPageSession } from "./patch";
import { demoPage } from "./pageFixtures";
function deferred<T>() {
  let resolve!: (v: T) => void, reject!: (e: unknown) => void;
  const promise = new Promise<T>((a, b) => {
    resolve = a;
    reject = b;
  });
  return { promise, resolve, reject };
}
it("serializes and coalesces rapid revisions; never reports saved before commit or for an older snapshot", async () => {
  const calls: PageRecord[] = [],
    a = deferred<PageRecord>(),
    b = deferred<PageRecord>(),
    statuses: SaveStatus[] = [];
  const write = vi.fn(async (record: unknown, _expected: Token) => {
    calls.push(record as PageRecord);
    return calls.length === 1 ? a.promise : b.promise;
  });
  const saver = createPageSaver(null, (s) => statuses.push(s), write);
  const session = createPageSession(demoPage);
  saver.enqueue({ ...session, revision: 1 });
  saver.enqueue({ ...session, revision: 2 });
  saver.enqueue({ ...session, revision: 3 });
  expect(write).toHaveBeenCalledTimes(1);
  expect(statuses.some((s) => s.kind === "saved")).toBe(false);
  a.resolve(calls[0]);
  await vi.waitFor(() => expect(write).toHaveBeenCalledTimes(2));
  expect(calls[1].revision).toBe(3);
  expect(statuses.some((s) => s.kind === "saved")).toBe(false);
  expect(write.mock.calls[1][1]).toEqual({
    revision: 1,
    writerSessionId: session.sessionId,
  });
  b.resolve(calls[1]);
  await vi.waitFor(() =>
    expect(statuses.at(-1)).toMatchObject({ kind: "saved", revision: 3 }),
  );
  saver.enqueue({ ...session, revision: 2 });
  expect(write).toHaveBeenCalledTimes(2);
  saver.close();
});
it("preserves the latest snapshot on quota errors and retries without advancing the baseline", async () => {
  const statuses: SaveStatus[] = [];
  const write = vi
    .fn()
    .mockRejectedValueOnce(new PageStorageError("QUOTA"))
    .mockImplementation(async (record) => record);
  const saver = createPageSaver(null, (s) => statuses.push(s), write);
  const session = createPageSession(demoPage);
  saver.enqueue({ ...session, revision: 1 });
  await vi.waitFor(() => expect(statuses.at(-1)?.kind).toBe("failed"));
  saver.enqueue({ ...session, revision: 2 });
  saver.retry();
  await vi.waitFor(() =>
    expect(statuses.at(-1)).toMatchObject({ kind: "saved", revision: 2 }),
  );
  expect(write.mock.calls[1][1]).toBeNull();
  saver.close();
});
it("closed old sessions discard queued saves and delayed callbacks", async () => {
  const pending = deferred<PageRecord>(),
    onStatus = vi.fn();
  const write = vi.fn(() => pending.promise);
  const saver = createPageSaver(null, onStatus, write);
  const session = createPageSession(demoPage);
  saver.enqueue({ ...session, revision: 1 });
  saver.enqueue({ ...session, revision: 2 });
  saver.close();
  const count = onStatus.mock.calls.length;
  pending.resolve(recordOf({ ...session, revision: 1 }));
  await pending.promise;
  await Promise.resolve();
  expect(write).toHaveBeenCalledTimes(1);
  expect(onStatus).toHaveBeenCalledTimes(count);
});
it("invalid snapshots safely fail without throwing away memory or writing unvalidated records", () => {
  const write = vi.fn(),
    statuses: SaveStatus[] = [];
  const saver = createPageSaver(null, (s) => statuses.push(s), write),
    session = createPageSession(demoPage);
  expect(() => saver.enqueue({ ...session, revision: -1 })).not.toThrow();
  expect(statuses.at(-1)).toMatchObject({
    kind: "failed",
    error: { code: "INVALID" },
  });
  saver.retry();
  expect(write).not.toHaveBeenCalled();
  expect(statuses).toHaveLength(2);
  saver.close();
});
