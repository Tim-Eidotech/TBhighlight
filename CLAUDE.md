# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## What this is

A Thunderbird WebExtension (MV2) that highlights address pills in the compose window: **blue (`#CCE0FF`)** for internal recipients (same domain as the user's account) and **pink (`#FFB3C1`)** for external recipients. Highlighting only activates when both internal and external recipients are present simultaneously.

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

Two files do all the work:

**`manifest.json`** — MV2 manifest. Declares a WebExtension Experiment (`heaExperiment`) implemented in `api/`.

**`background.js`** — Runs persistently. Calls `browser.heaExperiment.init()` once at startup to hand off to the Experiment API.

**`api/implementation.js`** — Chrome-privileged Experiment API. Uses `ExtensionSupport.registerWindowListener()` to watch every compose window. When a window loads (after `compose-editor-ready`), attaches a `MutationObserver` on `#recipientsContainer` and applies highlight colours to `mail-address-pill` elements. Also handles windows already open when the extension loads, and cleans up colours on shutdown.

**`api/schema.json`** — Declares the `heaExperiment.init()` function to the WebExtension runtime.

## Key implementation details

**Why a WebExtension Experiment:** Chrome-privileged code can query `mail-address-pill` elements directly via `querySelectorAll` across the compose window DOM without the shadow DOM traversal complexity that content scripts require. It also has direct access to `gCurrentIdentity` for the sender's domain.

**Colour logic:** `applyHighlighting()` reads each pill's `emailAddress` attribute, extracts the domain, and only activates colours when *both* internal and external recipients are present simultaneously. When all recipients are from one domain, all pills are reset to unstyled.

**Event timing:** `watchWindow()` listens for `compose-editor-ready` before querying the DOM, so the recipients area is guaranteed to be initialised. A 10-second polling fallback covers identity-load timing edge cases.

**Sender change:** `compose-from-changed` is listened on the window so that switching the From address immediately re-evaluates all pill colours against the new sender domain.
