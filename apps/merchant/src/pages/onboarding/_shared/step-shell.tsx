// The two-column layout every step sits in: content, and an optional panel
// beside it. The panel belongs here rather than inside a step widget, because
// the wizard widgets are also rendered by the Create Business modal, which has
// no room for an aside and no draft to derive one from.
import type { ReactNode } from "react";
import clsx from "clsx";

export function StepShell({ aside, children }: { aside?: ReactNode; children: ReactNode }) {
  return (
    <div className={clsx("grid gap-5", aside && "lg:grid-cols-[minmax(0,1fr)_330px]")}>
      <div className="min-w-0">{children}</div>
      {aside && <aside className="min-w-0">{aside}</aside>}
    </div>
  );
}
