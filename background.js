import { sendRequest } from "./request.js";

const SHOPIFY_ORIGIN = "https://www.shopify.com";

// Allows users to open the side panel by clicking on the action toolbar icon
chrome.sidePanel
  .setPanelBehavior({ openPanelOnActionClick: true })
  .catch((error) => console.error(error));

chrome.tabs.onUpdated.addListener(async (tabId, info, tab) => {
  if (!tab.url) return;
  const url = new URL(tab.url);
  // Enables the side panel on shopify.com
  if (url.origin === SHOPIFY_ORIGIN) {
    await chrome.sidePanel.setOptions({
      tabId,
      path: "sidebar.html",
      enabled: true,
    });
  // if tab is complete,send request
  if (tab.status === "complete") {
    await sendRequest();
  }
  } else {
    // Disables the side panel on all other sites
    await chrome.sidePanel.setOptions({
      tabId,
      enabled: false,
    });
  }
});

chrome.runtime.onMessage.addListener(async (request, sender, sendResponse) => {
  if (request.action === "sendRequest") {
    await sendRequest();
  }
});
