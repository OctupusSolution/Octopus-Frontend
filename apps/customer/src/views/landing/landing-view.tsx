import { Card, CardBody } from "@ui/primitives";
import type { Locale } from "@i18n/index";
import type { Tenant } from "@/entities/tenant";
import { SelectFulfillment } from "@/features/session/select-fulfillment";

export interface LandingViewProps {
  tenant: Tenant;
  locale: Locale;
}

export function LandingView({ tenant }: LandingViewProps) {
  return (
    <div className="mx-auto flex max-w-md flex-col items-center gap-5 px-4 py-10 sm:px-0">
      <h1 className="text-[21px] font-bold text-[var(--octo-text-primary)]">{tenant.name}</h1>
      <Card className="w-full">
        <CardBody>
          <SelectFulfillment tenant={tenant} />
        </CardBody>
      </Card>
    </div>
  );
}
