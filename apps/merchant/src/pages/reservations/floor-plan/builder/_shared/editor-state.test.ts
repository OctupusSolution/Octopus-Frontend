import { describe, expect, it } from "vitest";
import { addItem, createTable, emptyDoc, moveItems } from "@/entities/floor-plan";
import { HISTORY_LIMIT, editorReducer, initialEditorState } from "./editor-state";

describe("editorReducer", () => {
  const table = createTable("T1", 2, 2);
  const withTable = addItem(emptyDoc(), table);

  it("commits a change and undoes it", () => {
    const start = initialEditorState(emptyDoc());
    const added = editorReducer(start, { type: "commit", doc: withTable, selection: [table.id] });
    expect(added.doc.tables).toHaveLength(1);
    expect(added.selection).toEqual([table.id]);

    const undone = editorReducer(added, { type: "undo" });
    expect(undone.doc.tables).toHaveLength(0);
    // The table no longer exists, so it cannot stay selected.
    expect(undone.selection).toEqual([]);

    const redone = editorReducer(undone, { type: "redo" });
    expect(redone.doc.tables).toHaveLength(1);
  });

  it("drops the redo stack on a fresh change", () => {
    let state = initialEditorState(withTable);
    state = editorReducer(state, { type: "commit", doc: moveItems(state.doc, [table.id], 1, 0) });
    state = editorReducer(state, { type: "undo" });
    state = editorReducer(state, { type: "commit", doc: moveItems(state.doc, [table.id], 0, 1) });
    expect(state.future).toEqual([]);
    expect(editorReducer(state, { type: "redo" })).toBe(state);
  });

  it("bumps the revision only when the document changes", () => {
    const state = initialEditorState(withTable);
    expect(editorReducer(state, { type: "select", ids: [table.id] }).revision).toBe(0);
    expect(editorReducer(state, { type: "commit", doc: state.doc, selection: [table.id] }).revision).toBe(0);
    expect(editorReducer(state, { type: "commit", doc: moveItems(state.doc, [table.id], 1, 1) }).revision).toBe(1);
  });

  it("caps the undo history", () => {
    let state = initialEditorState(withTable);
    for (let i = 0; i < HISTORY_LIMIT + 20; i += 1) {
      state = editorReducer(state, { type: "commit", doc: moveItems(state.doc, [table.id], 0.5, 0) });
    }
    expect(state.past).toHaveLength(HISTORY_LIMIT);
  });

  it("ignores selections of ids that are not in the plan", () => {
    const state = editorReducer(initialEditorState(withTable), { type: "select", ids: [table.id, "ghost", table.id] });
    expect(state.selection).toEqual([table.id]);
  });
});
