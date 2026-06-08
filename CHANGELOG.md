# Changelog

## [1.0.6] - 2026-06-08
- Extend compatibility to Thunderbird 153.*
- Remove orphaned `compose.js` (unused since 1.0.4 architecture switch to Experiment API)
- Update CLAUDE.md to accurately reflect current Experiment API architecture

## [1.0.5] - 2026-06-04
- Rewrote core as a WebExtension Experiment (`heaExperiment`) running in chrome-privileged scope
- Replaced `composeScripts`-based injection with `ExtensionSupport.registerWindowListener()`
- Handles compose windows already open at extension load time
- Cleans up highlight colours on extension shutdown
- Adds `compose-from-changed` listener to re-evaluate colours when sender switches

## [1.0.4] - 2026-06-04
- Initial public release
- Highlights internal recipients blue (`#CCE0FF`) and external recipients pink (`#FFB3C1`)
- Highlighting activates only when both internal and external recipients are present
- Shadow DOM traversal via `openOrClosedShadowRoot` for TB 115+ (Supernova UI)
- XRay wrapper bypass via `wrappedJSObject` for content script email address access
