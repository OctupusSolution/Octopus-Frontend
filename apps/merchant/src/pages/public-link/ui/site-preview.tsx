// The preview card every step shows. Connected to a business, it is the live storefront
// (live-preview-frame.tsx): the real site as it would publish, following every edit. Without a
// business session there is no site to show, so the builder keeps its sample depiction
// (DeviceFrame over `previewModelFromSite`).
import type { ReactNode } from "react";
import { useI18n } from "@/app/providers/i18n-provider";
import type { PublicLinkSync, SiteAction, SiteDraft } from "@/entities/site-draft";
import type { PreviewDevice } from "@/widgets/storefront-preview";
import { previewModelFromSite } from "../_shared/preview-model";
import { DeviceFrame } from "./device-frame";
import { LivePreviewFrame } from "./live-preview-frame";

export interface SitePreviewProps {
  draft: SiteDraft;
  dispatch: (action: SiteAction) => void;
  sync: PublicLinkSync;
  device: PreviewDevice;
  onDevice: (device: PreviewDevice) => void;
  devices?: readonly PreviewDevice[];
  title?: string;
  subtitle?: string;
  actions?: ReactNode;
  /** Sample preview only: the paged viewport with slide dots. */
  paged?: boolean;
  /** Sample preview only: offer the preview-language menu. */
  withLanguage?: boolean;
  /** Live preview only: viewport height. */
  height?: number | string;
  /** Live preview only: the section being edited, and a section clicked in the preview. */
  selectedSectionId?: string | null;
  onSelectSection?: (sectionId: string) => void;
}

export function SitePreview({
  draft,
  dispatch,
  sync,
  device,
  onDevice,
  devices,
  title,
  subtitle,
  actions,
  paged,
  withLanguage,
  height,
  selectedSectionId,
  onSelectSection,
}: SitePreviewProps) {
  const { t, locale } = useI18n();
  if (sync.connected && sync.server) {
    return (
      <LivePreviewFrame
        sync={sync}
        draft={draft}
        dispatch={dispatch}
        device={device}
        onDevice={onDevice}
        title={title}
        subtitle={subtitle}
        actions={actions}
        height={height}
        selectedSectionId={selectedSectionId}
        onSelectSection={onSelectSection}
      />
    );
  }
  return (
    <DeviceFrame
      model={previewModelFromSite(draft, device, t, locale)}
      device={device}
      onDevice={onDevice}
      devices={devices}
      title={title}
      subtitle={subtitle}
      actions={actions}
      paged={paged}
      modelFor={withLanguage ? (scopedT, scopedLocale) => previewModelFromSite(draft, device, scopedT, scopedLocale) : undefined}
    />
  );
}
