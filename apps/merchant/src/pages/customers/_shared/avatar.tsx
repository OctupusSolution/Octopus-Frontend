// apps/merchant/src/pages/customers/_shared/avatar.tsx
function initials(name: string): string {
  return name
    .split(" ")
    .filter(Boolean)
    .slice(0, 2)
    .map((part) => part[0])
    .join("")
    .toUpperCase();
}

export function Avatar({ name, size = 40 }: { name: string; size?: number }) {
  return (
    <div
      className="grid shrink-0 place-items-center rounded-full bg-info/10 font-semibold text-[#0D6EFD]"
      style={{ width: size, height: size, fontSize: size * 0.38 }}
    >
      {initials(name)}
    </div>
  );
}
