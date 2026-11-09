import {
  recordOf,
  savePage,
  tokenOf,
  storageError,
  type Token,
  type PageRecord,
  PageStorageError,
} from "./pageStorage";
import type { PageSession } from "./patch";
export type SaveStatus = {
  kind: "unsaved" | "saving" | "saved" | "failed" | "conflict";
  revision: number;
  error?: PageStorageError;
};
// One in-flight transaction, one coalesced latest snapshot. Never advance token before completion.
export function createPageSaver(
  token: Token,
  onStatus: (status: SaveStatus) => void,
  write = savePage,
) {
  let invalidSession: PageSession | null = null;
  let highWater = token?.revision ?? -1;
  let baseline = token,
    pending: PageRecord | null = null,
    failed: PageRecord | null = null,
    running = false,
    closed = false,
    halted = false;
  async function drain() {
    if (running || closed || halted) return;
    running = true;
    while (pending && !closed && !halted) {
      const snapshot = pending;
      pending = null;
      try {
        const saved = await write(snapshot, baseline);
        baseline = tokenOf(saved);
        if (!closed && !pending && !halted)
          onStatus({ kind: "saved", revision: saved.revision });
      } catch (e) {
        const error = storageError(e);
        failed = pending ?? snapshot;
        pending = null;
        halted = true;
        if (!closed)
          onStatus({
            kind: error.code === "CONFLICT" ? "conflict" : "failed",
            revision: failed.revision,
            error,
          });
      }
    }
    running = false;
  }
  return {
    token(): Token {
      return baseline ? { ...baseline } : null;
    },
    enqueue(session: PageSession) {
      if (closed) return;
      let record: PageRecord;
      try {
        record = recordOf(session);
        invalidSession = null;
      } catch {
        invalidSession = session;
        halted = true;
        onStatus({
          kind: "failed",
          revision: session.revision,
          error: new PageStorageError("INVALID"),
        });
        return;
      }
      if (record.revision <= highWater) return;
      highWater = record.revision;
      if (halted) {
        failed = record;
        return;
      }
      if (pending && pending.revision >= record.revision) return;
      pending = record;
      onStatus({ kind: "saving", revision: record.revision });
      void drain();
    },
    retry() {
      if (closed) return;
      if (invalidSession) {
        this.enqueue(invalidSession);
        return;
      }
      if (!halted || !failed) return;
      halted = false;
      pending = failed;
      failed = null;
      onStatus({ kind: "saving", revision: pending.revision });
      void drain();
    },
    close() {
      closed = true;
      pending = null;
      failed = null;
      invalidSession = null;
    },
  };
}
