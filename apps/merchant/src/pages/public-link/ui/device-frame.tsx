// The card every step from here on wraps its `StorefrontPreview` in: a header
// with the step's title and a desktop/tablet/mobile `Segmented`, plus an
// optional actions slot, then the preview itself constrained to the active
// device's width and centred. `overflow-x-auto` on the preview wrapper is
// what keeps a merchant's mouse from being trapped in a horizontal scrollbar
// on the whole card when the desktop width doesn't fit a narrow viewport.
import type { ReactNode } from "react";
import { Monitor, Smartphone, Tablet } from "lucide-react";
import { Card, Segmented } from "@ui/primitives";
import { useI18n } from "@/app/providers/i18n-provider";
import { StorefrontPreview, type StorefrontPreviewModel, type PreviewDevice } from "@/widgets/storefront-preview";

const DEVICE_ICON: Readonly<Record<PreviewDevice, typeof Monitor>> = {
  desktop: Monitor,
  tablet: Tablet,
  mobile: Smartphone,
};

const DEVICE_LABEL_KEY: Readonly<Record<PreviewDevice, string>> = {
  desktop: "publicLink.device.desktop",
  tablet: "publicLink.device.tablet",
  mobile: "publicLink.device.mobile",
};

// Width constraints per device, matching the frames — desktop fills the
// column, tablet and mobile shrink to roughly device-width so the preview
// reads as a phone/tablet sitting inside the card rather than a stretched
// desktop layout.
const DEVICE_MAX_WIDTH: Readonly<Record<PreviewDevice, string>> = {
  desktop: "max-w-full",
  tablet: "max-w-[520px]",
  mobile: "max-w-[300px]",
};

const DEFAULT_DEVICES: readonly PreviewDevice[] = ["desktop", "tablet", "mobile"];

export interface DeviceFrameProps {
  model: StorefrontPreviewModel;
  device: PreviewDevice;
  onDevice: (device: PreviewDevice) => void;
  devices?: readonly PreviewDevice[];
  title?: string;
  actions?: ReactNode;
}

export function DeviceFrame({ model, device, onDevice, devices = DEFAULT_DEVICES, title, actions }: DeviceFrameProps) {
  const { t } = useI18n();

  return (
    <Card className="p-4">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <p className="text-[13px] font-medium text-[var(--octo-text-primary)]">{title ?? t("publicLink.livePreview")}</p>
        <div className="flex items-center gap-2">
          <Segmented
            options={devices.map((id) => {
              const Icon = DEVICE_ICON[id];
              return {
                id,
                label: (
                  <>
                    <Icon size={14} />
                    <span className="sr-only">{t(DEVICE_LABEL_KEY[id])}</span>
                  </>
                ),
              };
            })}
            value={device}
            onChange={(id) => onDevice(id as PreviewDevice)}
          />
          {actions}
        </div>
      </div>

      <div className="mt-4 overflow-x-auto">
        <div className={`mx-auto ${DEVICE_MAX_WIDTH[device]}`}>
          <StorefrontPreview model={model} />
        </div>
      </div>
    </Card>
  );
}
