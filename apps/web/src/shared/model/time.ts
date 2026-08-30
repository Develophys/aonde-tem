/**
 * The app's one relative-age format: "45min atrás", "2h atrás", "3d atrás".
 * Lives here because both the place sheet (from a server-computed ageMinutes) and
 * the moderation queue (from a timestamp) render it, and two copies would drift.
 */
export function formatAge(minutes: number): string {
  if (minutes < 60) return `${minutes}min atrás`;
  if (minutes < 1440) return `${Math.floor(minutes / 60)}h atrás`;
  return `${Math.floor(minutes / 1440)}d atrás`;
}

export function minutesSince(iso: string, now: Date = new Date()): number {
  return Math.max(0, Math.floor((now.getTime() - new Date(iso).getTime()) / 60_000));
}
