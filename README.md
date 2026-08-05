# X-Helper

A lightweight browser extension for controlling verified content on X.

X-Helper lets you choose where verified accounts are filtered and which verification badge types are affected.

## Features

- Filter verified accounts from replies
- Filter verified accounts from timelines
- Independent controls for blue, gold, and gray badges
- Master on/off control
- Preferences saved locally
- Chrome and Firefox support
- No analytics or external services

## Default configuration

X-Helper initially:

- Filters replies
- Leaves timeline posts visible
- Filters blue badges
- Leaves gold and gray badges visible

Every option can be changed from the extension popup.

## How it works

X-Helper examines posts already displayed on `x.com` or `twitter.com`.

For each post, it determines:

1. Whether the post is in a reply conversation or timeline
2. Whether the author has a blue, gold, or gray verification badge
3. Whether the user's selected filters apply

Matching posts are hidden locally in the browser.

Changing a setting saves the new configuration and refreshes the active page.

## Privacy

X-Helper does not collect or transmit user data.

The extension stores only the user's filter preferences in browser extension storage. All post detection and filtering happens locally.

See [PRIVACY.md](PRIVACY.md) for the complete privacy policy.

## Development

### Requirements

- Node.js
- npm

The current release was tested with Node.js 22 and npm 10.

### Install dependencies

```bash
npm install