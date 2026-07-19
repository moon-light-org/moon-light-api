type DefaultNicknameInput = {
  telegramId: string | number;
  firstName: string;
  username: string | null;
  randomNumber?: number;
};

function normalizeNamePart(value: string | null | undefined): string {
  const trimmed = typeof value === "string" ? value.trim() : "";
  if (!trimmed) {
    return "";
  }

  const [head = ""] = trimmed.split(/[\s_]+/, 1);
  return head.replace(/[^a-zA-Z0-9]/g, "");
}

function createSuffix(randomNumber?: number): string {
  if (Number.isInteger(randomNumber) && randomNumber! >= 1000 && randomNumber! <= 9999) {
    return String(randomNumber);
  }
  return String(Math.floor(Math.random() * 9000) + 1000);
}

export function createDefaultNickname({ telegramId, firstName, username, randomNumber }: DefaultNicknameInput): string {
  const preferredBase = normalizeNamePart(firstName) || normalizeNamePart(username);
  const fallbackBase = /^\d+$/.test(String(telegramId).trim()) ? "moon" : normalizeNamePart(String(telegramId)) || "moon";
  const base = preferredBase || fallbackBase;
  return `${base}_${createSuffix(randomNumber)}`;
}

export function isGeneratedNickname(nickname: string | null | undefined): boolean {
  return /^[a-zA-Z][a-zA-Z0-9]*_\d{4}$/i.test(nickname?.trim() ?? "");
}
