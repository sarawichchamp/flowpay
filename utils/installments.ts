import type { Locale } from "@/types/domain";

export type InstallmentProgress = {
  baseTitle: string;
  installmentNumber: number;
  totalInstallments: number;
};

export function parseInstallmentProgress(title: string): InstallmentProgress | null {
  const match = title.match(/^(.*?)(?:\s+)?(\d+)\s*\/\s*(\d+)$/);
  if (!match) return null;

  const [, rawBaseTitle, currentRaw, totalRaw] = match;
  const installmentNumber = Number(currentRaw);
  const totalInstallments = Number(totalRaw);

  if (!Number.isFinite(installmentNumber) || !Number.isFinite(totalInstallments)) {
    return null;
  }

  return {
    baseTitle: rawBaseTitle.trim() || title,
    installmentNumber,
    totalInstallments
  };
}

export function formatInstallmentProgressLabel(locale: Locale, title: string) {
  const progress = parseInstallmentProgress(title);
  if (!progress) return locale === "th" ? "งวดผ่อน" : "Installment";

  return locale === "th"
    ? `งวด ${progress.installmentNumber}/${progress.totalInstallments}`
    : `Installment ${progress.installmentNumber}/${progress.totalInstallments}`;
}
