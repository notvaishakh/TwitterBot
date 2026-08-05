import
{
  defaultSettings,
  normalizeSettings,
  settingsStorage,
  type ExtensionSettings,
} from "../utils/settings";

const tweetSelector =
  '[data-testid="tweet"]';

const tweetCellSelector =
  '[data-testid="cellInnerDiv"]';

const usernameSelector =
  '[data-testid="User-Name"]';

const verifiedBadgeSelector =
  '[data-testid="icon-verified"]';

const tweetTextSelector =
  '[data-testid="tweetText"]';

const hiddenClass =
  "x-helper-hidden-post";

const styleElementId =
  "x-helper-filter-style";

type BadgeType =
  | "blue"
  | "gold"
  | "gray"
  | "unknown";

type PostLocation =
  | "reply"
  | "timeline";

let currentSettings: ExtensionSettings =
{
  ...defaultSettings,
};

const pendingPosts =
  new Set<HTMLElement>();

let processingFrame:
  number |
  null = null;

/*
 * Remove elements and inline styles created by the older
 * filtered-feed experiments.
 */
function removeLegacyInterface(): void
{
  document
    .getElementById(
      "verified-filter-feed"
    )
    ?.remove();

  document
    .getElementById(
      "verified-filter-toggle"
    )
    ?.remove();

  const oldCategorizedCells =
    document.querySelectorAll<HTMLElement>(
      "[data-feed-category]"
    );

  oldCategorizedCells.forEach(
    cell =>
    {
      cell.style.removeProperty(
        "display"
      );

      delete cell.dataset.feedCategory;
    }
  );
}

function injectFilterStyles(): void
{
  if(
    document.getElementById(
      styleElementId
    )
  )
  {
    return;
  }

  const style =
    document.createElement("style");

  style.id = styleElementId;

  style.textContent = `
    .${hiddenClass}
    {
      display: none !important;
    }
  `;

  (
    document.head ??
    document.documentElement
  ).appendChild(style);
}

function getTweetCell(
  post: HTMLElement
): HTMLElement | null
{
  return post.closest<HTMLElement>(
    tweetCellSelector
  );
}

function collectBadgeTokens(
  badge: SVGElement
): string
{
  const tokens =
    new Set<string>();

  tokens.add(
    badge.outerHTML.toLowerCase()
  );

  const badgeElements: Element[] =
  [
    badge,
    ...Array.from(
      badge.querySelectorAll(
        "path, stop, g"
      )
    ),
  ];

  for(const element of badgeElements)
  {
    const attributes =
    [
      "fill",
      "color",
      "stop-color",
      "style",
    ];

    for(const attribute of attributes)
    {
      const value =
        element.getAttribute(attribute);

      if(value)
      {
        tokens.add(
          value.toLowerCase()
        );
      }
    }

    const computedStyle =
      window.getComputedStyle(element);

    tokens.add(
      computedStyle.color.toLowerCase()
    );

    tokens.add(
      computedStyle.fill.toLowerCase()
    );

    tokens.add(
      computedStyle
        .getPropertyValue("stop-color")
        .toLowerCase()
    );
  }

  return Array
    .from(tokens)
    .join(" ");
}

function getBadgeType(
  post: HTMLElement
): BadgeType
{
  /*
   * Only inspect the author's name block. This avoids
   * accidentally detecting a badge inside a quoted tweet.
   */
  const authorSection =
    post.querySelector<HTMLElement>(
      usernameSelector
    );

  if(!authorSection)
  {
    return "unknown";
  }

  const badge =
    authorSection.querySelector<SVGElement>(
      verifiedBadgeSelector
    );

  if(!badge)
  {
    return "unknown";
  }

  const tokens =
    collectBadgeTokens(badge);

  /*
   * Gray badge observed in the supplied White House DOM.
   */
  const grayTokens =
  [
    "#829aab",
    "rgb(130, 154, 171)",
  ];

  if(
    grayTokens.some(
      token => tokens.includes(token)
    )
  )
  {
    return "gray";
  }

  /*
   * Gold badges use SVG gradients rather than one inherited
   * CSS color, so several known gradient stops are checked.
   */
  const goldTokens =
  [
    "#f4e72a",
    "#f4ec26",
    "#f9e87f",
    "#e2b719",
    "#d18800",
    "#cd8105",
    "#cb7b00",
    "rgb(226, 183, 25)",
    "rgb(209, 136, 0)",
  ];

  if(
    goldTokens.some(
      token => tokens.includes(token)
    )
  )
  {
    return "gold";
  }

  /*
   * Blue badge observed in the supplied Fabrizio Romano DOM.
   */
  const blueTokens =
  [
    "#1d9bf0",
    "rgb(29, 155, 240)",
  ];

  if(
    blueTokens.some(
      token => tokens.includes(token)
    )
  )
  {
    return "blue";
  }

  /*
   * Fail safely. An unfamiliar badge should remain visible
   * rather than being hidden under the wrong category.
   */
  return "unknown";
}

function getStatusIdFromUrl(
  rawUrl: string
): string | null
{
  try
  {
    const url =
      new URL(
        rawUrl,
        window.location.origin
      );

    const match =
      url.pathname.match(
        /\/status\/(\d+)/
      );

    return match?.[1] ?? null;
  }
  catch
  {
    return null;
  }
}

function getCurrentPageStatusId():
  string |
  null
{
  const match =
    window.location.pathname.match(
      /\/status\/(\d+)/
    );

  return match?.[1] ?? null;
}

function getPostStatusId(
  post: HTMLElement
): string | null
{
  /*
   * The timestamp link is normally the post's canonical
   * status link and is safer than selecting an arbitrary
   * link from a quote or attachment.
   */
  const timeElement =
    post.querySelector("time");

  const timeLink =
    timeElement?.closest<HTMLAnchorElement>(
      'a[href*="/status/"]'
    );

  if(timeLink)
  {
    const statusId =
      getStatusIdFromUrl(timeLink.href);

    if(statusId)
    {
      return statusId;
    }
  }

  const statusLinks =
    post.querySelectorAll<HTMLAnchorElement>(
      'a[href*="/status/"]'
    );

  for(const link of statusLinks)
  {
    const statusId =
      getStatusIdFromUrl(link.href);

    if(statusId)
    {
      return statusId;
    }
  }

  return null;
}

function containsReplyingToLabel(
  post: HTMLElement
): boolean
{
  const tweetText =
    post.querySelector<HTMLElement>(
      tweetTextSelector
    );

  const possibleLabels =
    post.querySelectorAll<HTMLElement>(
      'div[dir="ltr"], span[dir="ltr"]'
    );

  for(const element of possibleLabels)
  {
    /*
     * Ignore the actual written post. A person may literally
     * write the words "Replying to" in their tweet.
     */
    if(
      element === tweetText ||
      tweetText?.contains(element) ||
      element.contains(tweetText)
    )
    {
      continue;
    }

    const text =
      element.innerText
        .replace(/\s+/g, " ")
        .trim();

    if(
      /^Replying to\b/i.test(text)
    )
    {
      return true;
    }
  }

  return false;
}

function getPostLocation(
  post: HTMLElement
): PostLocation
{
  const currentPageStatusId =
    getCurrentPageStatusId();

  /*
   * On a status page, the post matching the URL is the root
   * post. Other status IDs in that conversation are replies.
   */
  if(currentPageStatusId)
  {
    const postStatusId =
      getPostStatusId(post);

    if(postStatusId)
    {
      return postStatusId ===
        currentPageStatusId
        ? "timeline"
        : "reply";
    }
  }

  /*
   * This also detects reply posts appearing on profiles and
   * in normal timelines.
   */
  if(containsReplyingToLabel(post))
  {
    return "reply";
  }

  return "timeline";
}

function locationIsEnabled(
  location: PostLocation
): boolean
{
  if(location === "reply")
  {
    return currentSettings.hideInReplies;
  }

  return currentSettings.hideInTimeline;
}

function badgeIsEnabled(
  badgeType: BadgeType
): boolean
{
  switch(badgeType)
  {
    case "blue":
      return currentSettings.hideBlue;

    case "gold":
      return currentSettings.hideGold;

    case "gray":
      return currentSettings.hideGray;

    case "unknown":
    default:
      return false;
  }
}

function shouldHidePost(
  post: HTMLElement
): boolean
{
  if(!currentSettings.enabled)
  {
    return false;
  }

  const badgeType =
    getBadgeType(post);

  if(badgeType === "unknown")
  {
    return false;
  }

  const location =
    getPostLocation(post);

  return (
    locationIsEnabled(location) &&
    badgeIsEnabled(badgeType)
  );
}

function applyFilter(
  post: HTMLElement
): void
{
  const tweetCell =
    getTweetCell(post);

  if(!tweetCell)
  {
    return;
  }

  const shouldHide =
    shouldHidePost(post);

  tweetCell.classList.toggle(
    hiddenClass,
    shouldHide
  );

  tweetCell.dataset.xHelperState =
    shouldHide
      ? "hidden"
      : "visible";
}

function processAllPosts(): void
{
  const posts =
    document.querySelectorAll<HTMLElement>(
      tweetSelector
    );

  posts.forEach(applyFilter);
}

function flushPendingPosts(): void
{
  processingFrame = null;

  const posts =
    Array.from(pendingPosts);

  pendingPosts.clear();

  for(const post of posts)
  {
    applyFilter(post);
  }
}

function queuePost(
  post: HTMLElement
): void
{
  pendingPosts.add(post);

  if(processingFrame !== null)
  {
    return;
  }

  processingFrame =
    window.requestAnimationFrame(
      flushPendingPosts
    );
}

function inspectAddedNode(
  node: Node
): void
{
  if(!(node instanceof HTMLElement))
  {
    return;
  }

  if(node.matches(tweetSelector))
  {
    queuePost(node);
  }

  const containingPost =
    node.closest<HTMLElement>(
      tweetSelector
    );

  if(containingPost)
  {
    queuePost(containingPost);
  }

  const nestedPosts =
    node.querySelectorAll<HTMLElement>(
      tweetSelector
    );

  nestedPosts.forEach(queuePost);
}

export default defineContentScript({
  matches:
  [
    "https://x.com/*",
    "https://twitter.com/*",
  ],

  async main()
  {
    removeLegacyInterface();
    injectFilterStyles();

    try
    {
      const storedSettings =
        await settingsStorage.getValue();

      currentSettings =
        normalizeSettings(
          storedSettings
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

    processAllPosts();

    /*
     * This is a fallback in case a browser blocks or delays
     * the requested tab reload.
     */
    settingsStorage.watch(
      newSettings =>
      {
        currentSettings =
          normalizeSettings(
            newSettings
          );

        processAllPosts();
      }
    );

    const observer =
      new MutationObserver(
        mutations =>
        {
          for(const mutation of mutations)
          {
            mutation.addedNodes.forEach(
              inspectAddedNode
            );
          }
        }
      );

    observer.observe(
      document.body,
      {
        childList: true,
        subtree: true,
      }
    );
  },
});