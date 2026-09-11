// Offer Channels — where the combo can be ordered.
import { Checkbox } from "@ui/primitives";
import type { Offer } from "@/entities/menu";
import { useI18n } from "@/app/providers/i18n-provider";

const CHANNELS: (keyof Offer["channels"])[] = [
  "dineIn",
  "takeaway",
  "delivery",
  "kiosk",
  "onlineOrdering",
  "mobileApp",
];

export function TabChannels({
  offer,
  onPatch,
}: {
  offer: Offer;
  onPatch: (patch: Partial<Offer>) => void;
}) {
  const { t } = useI18n();

  return (
    <div className="max-w-[720px]">
      {CHANNELS.map((channel) => (
        <label key={channel} className="flex h-[50px] items-center gap-3 text-[16px]">
          <Checkbox
            className="[&_input]:h-6 [&_input]:w-6 [&>span]:h-6 [&>span]:w-6"
            checked={offer.channels[channel]}
            onChange={() =>
              onPatch({
                channels: { ...offer.channels, [channel]: !offer.channels[channel] },
              })
            }
          />
          <span
            className={
              offer.channels[channel]
                ? "font-medium text-[var(--octo-accent)]"
                : "font-medium text-[var(--octo-text-primary)]"
            }
          >
            {t(`menuOffer.channel.${channel}`)}
          </span>
        </label>
      ))}
    </div>
  );
}
