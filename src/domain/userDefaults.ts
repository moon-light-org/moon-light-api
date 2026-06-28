export function createDefaultNickname(telegramId: string | number): string {
  const normalized = String(telegramId).trim();
  const suffix = normalized.length > 6 ? normalized.slice(-6) : normalized;
  return `moon_${suffix || "user"}`;
}

export function isGeneratedNickname(nickname: string | null | undefined): boolean {
  return /^moon_[a-z0-9]+$/i.test(nickname?.trim() ?? "");
}
