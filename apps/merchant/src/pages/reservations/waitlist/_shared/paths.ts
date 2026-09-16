export const WAITLIST_PATH = "/reservations/waitlist";

export function waitlistSeatPath(id: string): string {
  return `${WAITLIST_PATH}/${encodeURIComponent(id)}/seat`;
}

