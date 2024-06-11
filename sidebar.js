import { sendRequest } from "./request.js";

const apiKeyInput = document.getElementById("apiKeyInput");
const summary = document.getElementById("summary");

chrome.storage.local.get(["myKey", "answer"], function (items) {
  if (items.myKey) {
    apiKeyInput.value = items.myKey;
  } else {
    changeSummary("None");
  }

  console.log(items.answer);

  if(items.answer) {
    summary.value = item.answer;
  } else {
    changeSummary("None");
  }
});

apiKeyInput.onkeydown = async function (event) {
  if (event.keyCode === 13) {
    const apiKey = document.getElementById("apiKeyInput").value;
    chrome.storage.local.set({ myKey: apiKey });
    if (apiKey) {
      chrome.runtime.sendMessage({
        action: "sendRequest",
      });
    } else {
      changeSummary("No API key available");
    }
  }
};

// 监听来自背景脚本的消息
chrome.runtime.onMessage.addListener((request, sender, sendResponse) => {
  if (request.action === "modifyDiv") {
    changeSummary(request.value);
  }
});

function changeSummary(newValue) {
  summary.textContent = newValue;
}

