"use strict";

const COLOR_INTERNAL = "#CCE0FF";
const COLOR_EXTERNAL = "#FFB3C1";

let senderDomain = null;

function getDomain(email) {
  if (!email || typeof email !== "string") return null;
  const i = email.lastIndexOf("@");
  if (i === -1) return null;
  return email.slice(i + 1).replace(/[>\s)]+$/, "").toLowerCase();
}

function getShadowRoot(element) {
  if (element.shadowRoot) return element.shadowRoot;
  try {
    return element.wrappedJSObject?.openOrClosedShadowRoot ?? null;
  } catch (_) {
    return null;
  }
}

function getEmailFromPill(pill) {
  let email = pill.getAttribute("emailAddress") || pill.getAttribute("emailaddress");
  if (email) return email;
  try {
    const u = pill.wrappedJSObject;
    email = u?.emailAddress ||
            u?.getAttribute?.("emailAddress") ||
            u?.getAttribute?.("emailaddress");
  } catch (_) {}
  return email || "";
}

function getPills() {
  const container = document.getElementById("recipientsContainer");
  if (!container) return [];

  // Direct query — works when pills are in the light DOM.
  const direct = Array.from(container.querySelectorAll("mail-address-pill"));
  if (direct.length > 0) return direct;

  // Shadow DOM traversal for TB 115+ (Supernova) where pills live inside
  // the shadow root of each mail-recipients-area element.
  const pills = [];
  function traverse(node) {
    for (const child of node.children || []) {
      if (child.localName === "mail-address-pill") {
        pills.push(child);
      }
      const shadow = getShadowRoot(child);
      if (shadow) traverse(shadow);
      traverse(child);
    }
  }
  traverse(container);
  return pills;
}

function applyHighlighting() {
  if (!senderDomain) return;
  for (const pill of getPills()) {
    const domain = getDomain(getEmailFromPill(pill));
    if (!domain) {
      pill.style.removeProperty("background-color");
      pill.style.removeProperty("color");
    } else if (domain === senderDomain) {
      pill.style.setProperty("background-color", COLOR_INTERNAL, "important");
      pill.style.setProperty("color", "#000", "important");
    } else {
      pill.style.setProperty("background-color", COLOR_EXTERNAL, "important");
      pill.style.setProperty("color", "#000", "important");
    }
  }
}

async function refreshAndApply() {
  try {
    const resp = await browser.runtime.sendMessage({ type: "getFromDomain" });
    senderDomain = resp?.domain ?? null;
  } catch (_) {
    senderDomain = null;
  }
  applyHighlighting();
}

function setupObservers() {
  const container = document.getElementById("recipientsContainer");
  if (!container) return;

  const obs = new MutationObserver(applyHighlighting);
  obs.observe(container, {
    childList: true,
    subtree: true,
    attributes: true,
    attributeFilter: ["emailAddress"],
  });

  // Additional observers for any shadow roots already present.
  for (const area of container.querySelectorAll("mail-recipients-area")) {
    const shadow = getShadowRoot(area);
    if (shadow) {
      const shadowObs = new MutationObserver(applyHighlighting);
      shadowObs.observe(shadow, {
        childList: true,
        subtree: true,
        attributes: true,
        attributeFilter: ["emailAddress"],
      });
    }
  }
}

async function init() {
  // Wait up to 10 s for the recipients container (compose-editor-ready timing).
  let container = null;
  for (let i = 0; i < 20; i++) {
    container = document.getElementById("recipientsContainer");
    if (container) break;
    await new Promise(r => setTimeout(r, 500));
  }
  if (!container) return;

  await refreshAndApply();
  setupObservers();

  // Re-evaluate colours when the sender identity changes.
  document.getElementById("msgIdentity")?.addEventListener("command", refreshAndApply);

  // Polling fallback covers identity-load timing edge cases.
  let ticks = 0;
  const id = setInterval(() => {
    applyHighlighting();
    if (++ticks >= 10) clearInterval(id);
  }, 1000);
}

init();
