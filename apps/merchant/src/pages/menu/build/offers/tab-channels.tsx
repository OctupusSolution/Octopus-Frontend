// Offer Channels — where the combo can be ordered.
import clsx from "clsx";
import type { Offer } from "@/entities/menu";
import { useI18n } from "@/app/providers/i18n-provider";
import { CheckBox } from "../../_shared/controls";
import { TEXT } from "../../_shared/theme";
import type { OfferTabValidation } from "./index";

const CHANNELS: (keyof Offer["channels"])[] = [
  "dineIn",
  "takeaway",
  "delivery",
  "kiosk",
  "onlineOrdering",
  "mobileApp",
];

const CHECKED_TEXT = "text-[#0058da] [[data-theme=dark]_&]:text-[#8ab8ff]";

export function TabChannels({
  offer,
  onPatch,
  validation,
}: {
  offer: Offer;
  onPatch: (patch: Partial<Offer>) => void;
  validation: OfferTabValidation;
}) {
  const { t } = useI18n();
  const { errors, onTouch } = validation;

  return (
    <div className="flex flex-col gap-3">
      {CHANNELS.map((channel) => (
        <CheckBox
          key={channel}
          className="self-start"
          checked={offer.channels[channel]}
          onChange={(next) => {
            onPatch({ channels: { ...offer.channels, [channel]: next } });
            onTouch("channels");
          }}
          label={
            <span className={clsx("text-[14px] font-semibold leading-[14px]", offer.channels[channel] ? CHECKED_TEXT : TEXT)}>
              {t(`menuOffer.channel.${channel}`)}
            </span>
          }
        />
      ))}
      {errors.channels && (
        <p role="alert" className="text-[12px] leading-[14px] text-[#d30202]">
          {t(errors.channels)}
        </p>
      )}
    </div>
  );
}
