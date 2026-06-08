"use strict";

(function (exports) {

  const { ExtensionSupport } = ChromeUtils.importESModule(
    "resource:///modules/ExtensionSupport.sys.mjs"
  );

  const COMPOSE_URL =
    "chrome://messenger/content/messengercompose/messengercompose.xhtml";

  const COLOR_INTERNAL = "#CCE0FF";
  const COLOR_EXTERNAL = "#FFB3C1";

  function getDomain(email) {
    if (!email || typeof email !== "string") return null;
    const i = email.lastIndexOf("@");
    if (i === -1) return null;
    return email.slice(i + 1).replace(/[>\s)]+$/, "").toLowerCase();
  }

  function applyHighlighting(win) {
    const identity = win.gCurrentIdentity;
    if (!identity?.email) return;
    const myDomain = getDomain(identity.email);
    if (!myDomain) return;

    const container = win.document.getElementById("recipientsContainer");
    if (!container) return;

    const pills = Array.from(container.querySelectorAll("mail-address-pill"));
    const domains = pills.map(p =>
      getDomain(p.getAttribute("emailAddress") || p.getAttribute("emailaddress") || "")
    );

    pills.forEach((pill, i) => {
      const d = domains[i];
      if (!d) {
        pill.style.removeProperty("background-color");
        pill.style.removeProperty("color");
      } else if (d === myDomain) {
        pill.style.setProperty("background-color", COLOR_INTERNAL, "important");
        pill.style.setProperty("color", "#000", "important");
      } else {
        pill.style.setProperty("background-color", COLOR_EXTERNAL, "important");
        pill.style.setProperty("color", "#000", "important");
      }
    });
  }

  function watchWindow(win) {
    const container = win.document.getElementById("recipientsContainer");
    if (!container) return;

    applyHighlighting(win);

    const observer = new win.MutationObserver(() => applyHighlighting(win));
    observer.observe(container, {
      childList: true,
      subtree: true,
      attributes: true,
      attributeFilter: ["emailAddress"],
    });

    win.addEventListener("compose-from-changed", () => applyHighlighting(win));

    // Poll for 10 s as a safety net for identity-load timing edge cases.
    let ticks = 0;
    const pollId = win.setInterval(() => {
      applyHighlighting(win);
      if (++ticks >= 10) win.clearInterval(pollId);
    }, 1000);

    win.addEventListener(
      "unload",
      () => {
        observer.disconnect();
        win.clearInterval(pollId);
      },
      { once: true }
    );
  }

  function onLoadWindow(win) {
    if (win.composeEditorReady) {
      watchWindow(win);
    } else {
      win.addEventListener("compose-editor-ready", () => watchWindow(win), {
        once: true,
      });
    }
  }

  class HeaExperiment extends ExtensionCommon.ExtensionAPI {
    getAPI(context) {
      return {
        heaExperiment: {
          init() {
            ExtensionSupport.registerWindowListener(context.extension.id, {
              chromeURLs: [COMPOSE_URL],
              onLoadWindow,
            });

            // Handle compose windows already open at extension load time.
            for (const win of ExtensionSupport.openWindows) {
              if (win.location?.href === COMPOSE_URL) {
                onLoadWindow(win);
              }
            }
          },
        },
      };
    }

    onShutdown(isAppShutdown) {
      if (isAppShutdown) return;
      const { extension } = this;

      for (const win of ExtensionSupport.openWindows) {
        if (win.location?.href === COMPOSE_URL) {
          try {
            const container = win.document.getElementById("recipientsContainer");
            if (container) {
              for (const pill of container.querySelectorAll("mail-address-pill")) {
                pill.style.removeProperty("background-color");
                pill.style.removeProperty("color");
              }
            }
          } catch (e) {
            // ignore
          }
        }
      }

      ExtensionSupport.unregisterWindowListener(extension.id);
    }
  }

  exports.heaExperiment = HeaExperiment;

})(this);
