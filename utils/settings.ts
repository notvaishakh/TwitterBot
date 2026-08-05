import { storage } from "#imports";

export type ExtensionSettings =
{
  enabled: boolean;

  hideInReplies: boolean;
  hideInTimeline: boolean;

  hideBlue: boolean;
  hideGold: boolean;
  hideGray: boolean;
};

export const defaultSettings: ExtensionSettings =
{
  enabled: true,

  hideInReplies: true,
  hideInTimeline: false,

  hideBlue: true,
  hideGold: false,
  hideGray: false,
};

/*
 * This uses a new storage key so the older three-setting
 * version cannot corrupt the new badge-based settings.
 */
export const settingsStorage =
  storage.defineItem<ExtensionSettings>(
    "local:xHelperSettings",
    {
      fallback:
      {
        ...defaultSettings,
      },
    }
  );

export function normalizeSettings(
  value:
    | Partial<ExtensionSettings>
    | null
    | undefined
): ExtensionSettings
{
  return {
    enabled:
      value?.enabled ??
      defaultSettings.enabled,

    hideInReplies:
      value?.hideInReplies ??
      defaultSettings.hideInReplies,

    hideInTimeline:
      value?.hideInTimeline ??
      defaultSettings.hideInTimeline,

    hideBlue:
      value?.hideBlue ??
      defaultSettings.hideBlue,

    hideGold:
      value?.hideGold ??
      defaultSettings.hideGold,

    hideGray:
      value?.hideGray ??
      defaultSettings.hideGray,
  };
}