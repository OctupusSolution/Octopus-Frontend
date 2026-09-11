// `/menu/import` — the AI import, three screens on one route.
//
// The route registry is a flat list this feature may not change, so the step
// lives in the query string instead of the path: `?step=review` and
// `?step=edit`. That still gives each screen its own address, so browser-back
// walks the flow rather than leaving it.
//
// The detection lives in memory (see session-store), so a reload or a pasted
// link to a later step finds nothing to review and goes back to upload, rather
// than rendering an editor over a menu that is not there.
import { useEffect } from "react";
import { Navigate, useSearchParams } from "react-router-dom";
import { EditScreen } from "./edit-screen";
import { ReviewScreen } from "./review-screen";
import { useImportSession } from "./session-store";
import { UploadScreen } from "./upload-screen";

export function ImportMenuPage() {
  const [params] = useSearchParams();
  const step = params.get("step");
  const session = useImportSession();

  // Each step is a new page to the merchant; open it at the top.
  useEffect(() => {
    window.scrollTo(0, 0);
    document.querySelector("main")?.scrollTo?.(0, 0);
  }, [step]);

  if ((step === "review" || step === "edit") && (session.phase !== "done" || !session.result)) {
    return <Navigate to="/menu/import" replace />;
  }
  if (step === "review") return <ReviewScreen />;
  if (step === "edit") return <EditScreen />;
  return <UploadScreen />;
}
