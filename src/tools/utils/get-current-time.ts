export function getCurrentTime(args: Record<string, unknown>) {
  const timeZone =
    typeof args.timeZone === 'string' ? args.timeZone : undefined;

  const now = new Date();

  return {
    utc: now.toISOString(),
    timeZone: timeZone ?? null,
    localTime: timeZone ? now.toLocaleString('ru-RU', { timeZone }) : null,
  };
}
