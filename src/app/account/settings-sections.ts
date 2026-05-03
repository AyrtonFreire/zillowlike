export const ACCOUNT_SETTINGS_SECTIONS = [
  "overview",
  "professional",
  "public",
  "access",
  "security",
] as const;

export type AccountSettingsSectionId = (typeof ACCOUNT_SETTINGS_SECTIONS)[number];

export function isAccountSettingsSectionId(value: string | null | undefined): value is AccountSettingsSectionId {
  return ACCOUNT_SETTINGS_SECTIONS.includes((value || "") as AccountSettingsSectionId);
}
