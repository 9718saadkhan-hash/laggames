/** Date-only releases use midnight in the store's India time zone. */
export function releaseCountdown(releaseDate: string | null | undefined, now: number) {
  if (!releaseDate || !/^\d{4}-\d{2}-\d{2}$/.test(releaseDate)) return null;
  const target = Date.parse(`${releaseDate}T00:00:00+05:30`);
  const calendarDate = new Date(`${releaseDate}T00:00:00Z`);
  if (!Number.isFinite(target) || !Number.isFinite(calendarDate.getTime()) || calendarDate.toISOString().slice(0, 10) !== releaseDate) return null;
  const total = Math.max(0, Math.ceil((target - now) / 1000));
  return {
    reached: total === 0,
    days: Math.floor(total / 86400),
    hours: Math.floor((total % 86400) / 3600),
    minutes: Math.floor((total % 3600) / 60),
    seconds: total % 60,
  };
}