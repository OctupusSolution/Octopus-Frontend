// The import's two exits, which are the same act with different destinations:
// turn the detection into a Menu, add it to the library, leave.
//
// "Save as Draft" lands on the library, where the new card shows as pending.
// "Configure & Publish" lands on the builder's Theme step — sections and items
// are already done, which is the whole point of importing — and the builder's
// own stepper takes it from there.
import { useCallback } from "react";
import { useNavigate } from "react-router-dom";
import { SEED_BRANCHES, useMenuLibrary } from "@/entities/menu";
import { menuNameFromFile, toMenu } from "@/entities/menu/ai-import";
import { resetImport, useImportSession } from "./session-store";

export function useCommitImport() {
  const { menus, setMenus } = useMenuLibrary();
  const navigate = useNavigate();
  const session = useImportSession();
  const ready = session.phase === "done" && session.result !== null && session.file !== null;

  const commit = useCallback(
    (destination: "draft" | "publish") => {
      if (!ready || !session.result || !session.file) return;
      const id = `m-${Date.now().toString(36)}`;
      let n = 0;
      const menu = toMenu(session.result, {
        id,
        branchId: SEED_BRANCHES[0].id,
        now: new Date().toISOString(),
        newId: () => `${id}-${(n += 1)}`,
        name: menuNameFromFile(session.file.name),
      });
      setMenus([...menus, menu]);
      navigate(destination === "draft" ? "/menu" : `/menu/${id}/build/theme`);
      // After navigation has unmounted the import: clearing first would make
      // the current screen's guard redirect to upload before we leave.
      setTimeout(resetImport, 0);
    },
    [ready, session.result, session.file, menus, setMenus, navigate]
  );

  return { ready, commit };
}
