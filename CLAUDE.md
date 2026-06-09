# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## What this is

A Thunderbird WebExtension (MV2) that highlights address pills in the compose window: **blue (`#CCE0FF`)** for internal recipients (same domain as the user's account) and **pink (`#FFB3C1`)** for external recipients.

## Build

```bash
make        # produces colour-addresses-<version>.xpi
make clean  # removes .xpi files
```

Version is read automatically from `manifest.json`. Requires `python3` and `zip`.

## Installing for testing

In Thunderbird: **Tools → Add-ons and Themes → gear icon → Install Add-on From File…**, then select the `.xpi`. To reload during development without reinstalling, use **about:debugging → This Thunderbird → Load Temporary Add-on…** and point it at `manifest.json` directly.

Bump `manifest.json` `"version"` before each reinstall — Thunderbird caches aggressively.

## Architecture

Three files do all the work:

**`manifest.json`** — MV2 manifest. Declares a `compose_scripts` entry that injects `compose_script.js` into every compose window, and a `background` that runs `background.js`. Requires the `compose` permission for `browser.compose.getComposeDetails()`.

**`background.js`** — Persistent background script. Listens for `{type: "getFromDomain"}` messages from the compose script and responds with the sender's domain, extracted from `browser.compose.getComposeDetails(tabId)`.

**`compose_script.js`** — Injected into every compose window at `document_idle`. Waits for `#recipientsContainer` to appear, then:
- Queries pills from the DOM (with a shadow-DOM traversal fallback for TB 115+ Supernova UI)
- Applies highlight colours to `mail-address-pill` elements
- Sets a `MutationObserver` on the container (and any shadow roots found)
- Listens for `command` events on `#msgIdentity` to re-evaluate when the sender changes
- Runs a 10-second polling fallback for identity-load timing edge cases

## Key implementation details

**No Experiment API:** Thunderbird's add-on gallery paused reviews of Experiment API submissions (June 2026), so the extension uses only standard WebExtension APIs.

**Sender domain:** The compose script sends `{type: "getFromDomain"}` to the background, which calls `browser.compose.getComposeDetails(sender.tab.id)` and parses the `from` field.

**Shadow DOM:** In TB 115+ (Supernova UI), `mail-address-pill` elements live inside the shadow root of `mail-recipients-area` custom elements. The compose script first tries `.shadowRoot` (open shadows), then falls back to `element.wrappedJSObject.openOrClosedShadowRoot` (Xray bypass available to Thunderbird compose scripts).

**Email attribute access:** Pills' `emailAddress` attribute is read via `getAttribute` first; if Xray wrapping blocks it, `pill.wrappedJSObject` is used as a fallback.

**Event timing:** The compose script waits up to 10 s for `#recipientsContainer` to appear before giving up. The MutationObserver and `msgIdentity` `command` listener keep colours current after load.
