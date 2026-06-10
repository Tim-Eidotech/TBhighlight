"use strict";

browser.runtime.onMessage.addListener(async (message, sender) => {
  if (message.type !== "getFromDomain" || sender.tab?.id == null) return;
  try {
    const details = await browser.compose.getComposeDetails(sender.tab.id);
    const from = details.from || "";
    const match = from.match(/<([^>]+)>/);
    const email = (match ? match[1] : from).trim();
    const at = email.lastIndexOf("@");
    return { domain: at !== -1 ? email.slice(at + 1).toLowerCase() : null };
  } catch (_) {
    return { domain: null };
  }
});
