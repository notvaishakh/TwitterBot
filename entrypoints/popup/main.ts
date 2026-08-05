import "./style.css";

import { browser } from "wxt/browser";

import
{
  defaultSettings,
  normalizeSettings,
  settingsStorage,
  type ExtensionSettings,
} from "../../utils/settings";

function requireElement<T extends HTMLElement>(
  selector: string
): T
{
  const element =
    document.querySelector<T>(selector);

  if(!element)
  {
    throw new Error(
      `Missing popup element: ${selector}`
    );
  }

  return element;
}

const enabledToggle =
  requireElement<HTMLInputElement>(
    "#enabled-toggle"
  );

const repliesToggle =
  requireElement<HTMLInputElement>(
    "#replies-toggle"
  );

const timelineToggle =
  requireElement<HTMLInputElement>(
    "#timeline-toggle"
  );

const blueToggle =
  requireElement<HTMLInputElement>(
    "#blue-toggle"
  );

const goldToggle =
  requireElement<HTMLInputElement>(
    "#gold-toggle"
  );

const grayToggle =
  requireElement<HTMLInputElement>(
    "#gray-toggle"
  );

const filterControls =
  requireElement<HTMLDivElement>(
    "#filter-controls"
  );

const statusText =
  requireElement<HTMLSpanElement>(
    "#status-text"
  );

const saveStatus =
  requireElement<HTMLParagraphElement>(
    "#save-status"
  );

let currentSettings: ExtensionSettings =
{
  ...defaultSettings,
};

let reloadTimer:
  number |
  undefined;

function render(
  settings: ExtensionSettings
): void
{
  enabledToggle.checked =
    settings.enabled;

  repliesToggle.checked =
    settings.hideInReplies;

  timelineToggle.checked =
    settings.hideInTimeline;

  blueToggle.checked =
    settings.hideBlue;

  goldToggle.checked =
    settings.hideGold;

  grayToggle.checked =
    settings.hideGray;

  const disabled =
    !settings.enabled;

  repliesToggle.disabled = disabled;
  timelineToggle.disabled = disabled;
  blueToggle.disabled = disabled;
  goldToggle.disabled = disabled;
  grayToggle.disabled = disabled;

  filterControls.classList.toggle(
    "disabled",
    disabled
  );

  statusText.textContent =
    settings.enabled
      ? "On"
      : "Off";
}

function scheduleReload(): void
{
  if(reloadTimer !== undefined)
  {
    window.clearTimeout(reloadTimer);
  }

  saveStatus.textContent =
    "Settings saved. Refreshing the page.";

  /*
   * Multiple quick changes become one refresh.
   */
  reloadTimer =
    window.setTimeout(
      async () =>
      {
        try
        {
          await browser.tabs.reload();
        }
        catch(error)
        {
          console.error(
            "X-Helper could not refresh the page:",
            error
          );

          saveStatus.textContent =
            "Settings saved. Refresh the page manually.";
        }
      },
      700
    );
}

async function updateSettings(
  changes: Partial<ExtensionSettings>
): Promise<void>
{
  currentSettings =
    normalizeSettings(
      {
        ...currentSettings,
        ...changes,
      }
    );

  render(currentSettings);

  try
  {
    await settingsStorage.setValue(
      currentSettings
    );

    scheduleReload();
  }
  catch(error)
  {
    console.error(
      "X-Helper could not save settings:",
      error
    );

    saveStatus.textContent =
      "Settings could not be saved.";
  }
}

enabledToggle.addEventListener(
  "change",
  () =>
  {
    void updateSettings(
      {
        enabled:
          enabledToggle.checked,
      }
    );
  }
);

repliesToggle.addEventListener(
  "change",
  () =>
  {
    void updateSettings(
      {
        hideInReplies:
          repliesToggle.checked,
      }
    );
  }
);

timelineToggle.addEventListener(
  "change",
  () =>
  {
    void updateSettings(
      {
        hideInTimeline:
          timelineToggle.checked,
      }
    );
  }
);

blueToggle.addEventListener(
  "change",
  () =>
  {
    void updateSettings(
      {
        hideBlue:
          blueToggle.checked,
      }
    );
  }
);

goldToggle.addEventListener(
  "change",
  () =>
  {
    void updateSettings(
      {
        hideGold:
          goldToggle.checked,
      }
    );
  }
);

grayToggle.addEventListener(
  "change",
  () =>
  {
    void updateSettings(
      {
        hideGray:
          grayToggle.checked,
      }
    );
  }
);

async function initialize(): Promise<void>
{
  try
  {
    currentSettings =
      normalizeSettings(
        await settingsStorage.getValue()
      );
  }
  catch(error)
  {
    console.error(
      "X-Helper could not load settings:",
      error
    );

    currentSettings =
    {
      ...defaultSettings,
    };
  }

  render(currentSettings);
}

void initialize();