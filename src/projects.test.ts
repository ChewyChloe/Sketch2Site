import { IDBFactory } from "fake-indexeddb";
import { beforeEach, it, expect } from "vitest";
import { database, saveDraft, loadDraft } from "./storage";
import { blank, createNode } from "./spec";
import { listProjects, createProject, openProject, renameProject, duplicateProject, deleteProject } from "./projects";
import { projectId } from "./pageStorage";

beforeEach(() => {
  globalThis.indexedDB = new IDBFactory();
});
const named = (name: string, nodes = 0) => {
  const d = blank();
  return { ...d, metadata: { ...d.metadata, name }, nodes: Array.from({ length: nodes }, (_, i) => createNode("text", 80, 80 + i * 80)) };
};
async function activePage() {
  const db = await database();
  const v = await new Promise((res) => { const r = db.transaction("pages").objectStore("pages").get(projectId); r.onsuccess = () => res(r.result); });
  db.close();
  return v;
}
async function putActivePage(value: unknown) {
  const db = await database();
  await new Promise<void>((res) => { const t = db.transaction("pages", "readwrite"); t.objectStore("pages").put(value, projectId); t.oncomplete = () => res(); });
  db.close();
}

it("adopts the existing single draft as the first project without losing it", async () => {
  await saveDraft(named("我的作品集", 2));
  const list = await listProjects();
  expect(list).toHaveLength(1);
  expect(list[0]).toMatchObject({ name: "我的作品集", active: true });
  expect(list[0].draft.nodes).toHaveLength(2);
  expect((await loadDraft())?.metadata.name).toBe("我的作品集");
});

it("creates, switches and keeps each project's draft and page separate", async () => {
  await saveDraft(named("A", 1));
  await putActivePage({ marker: "page-A" });
  const b = await createProject("B");
  expect((await loadDraft())?.metadata.name).toBe("B");
  expect(await activePage()).toBeUndefined();
  await saveDraft(named("B", 3));
  const a = (await listProjects()).find((p) => p.name === "A")!;
  expect(a.active).toBe(false);
  expect(a.hasPage).toBe(true);
  await openProject(a.id);
  expect((await loadDraft())?.nodes).toHaveLength(1);
  expect(await activePage()).toEqual({ marker: "page-A" });
  await openProject(b);
  expect((await loadDraft())?.nodes).toHaveLength(3);
  expect(await activePage()).toBeUndefined();
});

it("renames open and parked projects, duplicates, and deletes safely", async () => {
  await saveDraft(named("A", 1));
  await createProject("B");
  let list = await listProjects();
  const a = list.find((p) => p.name === "A")!, b = list.find((p) => p.name === "B")!;
  await renameProject(a.id, "  作品 A  ");
  await renameProject(b.id, "活動 B");
  await expect(renameProject(b.id, "   ")).rejects.toThrow();
  expect((await loadDraft())?.metadata.name).toBe("活動 B");
  const copy = await duplicateProject(a.id);
  list = await listProjects();
  expect(list.map((p) => p.name).sort()).toEqual(["作品 A", "作品 A 副本", "活動 B"]);
  expect(list.find((p) => p.id === copy)!.draft.nodes).toHaveLength(1);
  // Deleting the open project opens another one.
  expect(await deleteProject(b.id)).toBe(true);
  list = await listProjects();
  expect(list).toHaveLength(2);
  expect(list.some((p) => p.active)).toBe(true);
  await deleteProject(list.find((p) => !p.active)!.id);
  await expect(deleteProject((await listProjects())[0].id)).rejects.toThrow("至少要保留一個專案");
});

it("starts a project from an example without touching the current one", async () => {
  await saveDraft(named("A", 2));
  await createProject("範例", named("ignored", 4));
  expect((await loadDraft())?.metadata.name).toBe("範例");
  expect((await loadDraft())?.nodes).toHaveLength(4);
  const a = (await listProjects()).find((p) => p.name === "A")!;
  expect(a.draft.nodes).toHaveLength(2);
});

it("refuses unknown project ids", async () => {
  await saveDraft(named("A"));
  await expect(openProject(crypto.randomUUID())).rejects.toThrow();
});
