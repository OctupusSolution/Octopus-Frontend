// A round initials badge for a guest name. The background colour is a
// deterministic hash of the name into a fixed six-colour ring — no
// Math.random — so the same guest always renders the same colour, in this
// row and everywhere else the avatar shows up.
const AVATAR_RING = ["#0D6EFD", "#16A34A", "#7C3AED", "#D97706", "#DC2626", "#0891B2"] as const;

function hashName(name: string): number {
  let hash = 0;
  for (let i = 0; i < name.length; i++) {
    hash = (hash * 31 + name.charCodeAt(i)) | 0;
  }
  return Math.abs(hash);
}

function initials(name: string): string {
  return name
    .trim()
    .split(/\s+/)
    .filter(Boolean)
    .slice(0, 2)
    .map((word) => word[0]!.toUpperCase())
    .join("");
}

export interface GuestAvatarProps {
  name: string;
  size?: number;
}

export function GuestAvatar({ name, size = 28 }: GuestAvatarProps) {
  const color = AVATAR_RING[hashName(name) % AVATAR_RING.length];
  return (
    <div
      className="inline-flex shrink-0 items-center justify-center rounded-full text-[11px] font-semibold text-white"
      style={{ width: size, height: size, backgroundColor: color }}
    >
      {initials(name)}
    </div>
  );
}
