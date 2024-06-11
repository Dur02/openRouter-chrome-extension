export function DOMtoString(selector) {
  if (selector) {
    selector = document.querySelector(selector);
    if (!selector) return "ERROR: querySelector failed to find node";
  } else {
    selector = document.documentElement;
  }
  return selector.outerHTML;
}

export function onWindowLoad() {
  return chrome.tabs
    .query({ active: true, currentWindow: true })
    .then(function (tabs) {
      const activeTab = tabs[0];
      const activeTabId = activeTab.id;

      return chrome.scripting.executeScript({
        target: { tabId: activeTabId },
        // injectImmediately: true,  // uncomment this to make it execute straight away, other wise it will wait for document_idle
        func: DOMtoString,
        // args: ['body']  // you can use this to target what element to get the html for
      });
    })
    .then(function (results) {
      return results;
    })
    .catch(function (error) {
      return error;
    });
}

// 发送请求
export async function sendRequest() {
  const result = await onWindowLoad();
  if (result[0]) {
    const prompt = `Summarizethefollowing pagecontent: ${result[0].result}`;

    chrome.storage.local.get(["myKey"], async function (items) {
      if (items.myKey) {
        const response = await fetch(
          "https://openrouter.ai/api/v1/chat/completions",
          {
            method: "POST",
            headers: {
              "Content-Type": "application/json",
              // 加上apiKey
              Authorization: `Bearer ${items.myKey}`,
            },
            body: JSON.stringify({
              model: "mistralai/mistral-7b-instruct:free",
              messages: [{ role: "user", content: prompt }],
              // 确保启用流式传输
              stream: true,
            }),
          }
        );

        chrome.runtime.sendMessage({
          action: "modifyDiv",
          value: "Loading",
        });

        if (response.ok) {
          const reader = response.body.getReader();
          let decoder = new TextDecoder();

          let buffer = "";
          let matchArr = "";

          while (true) {
            const { done, value } = await reader.read();

            if (done) {
              // 全部获取流式数据结束后的操作
              break;
            }

            // 将读取到的数据添加到缓冲区（可能是因为客户端处理数据的速度比服务器发送数据的速度快，
            // 导致一次性接收到多条数据。这时候就要用buffer缓冲区来处理一下）
            // 给我的数据格式：{"content": "数据"}
            buffer += decoder.decode(value, { stream: true });

            // 尝试解析每条消息
            let startIndex = buffer.indexOf("{");
            let endIndex = buffer.indexOf("}", startIndex);

            while (startIndex !== -1 && endIndex !== -1) {
              const resultData = buffer.substring(startIndex, endIndex + 1);
              buffer = buffer.substring(endIndex + 1); // 移除已处理的数据

              // 寻找下一条消息的起始位置
              startIndex = buffer.indexOf("{");
              endIndex = buffer.indexOf("}", startIndex);

              // 定义正则表达式来匹配 chunk_message 的值，我们只要chunk_message对应的值
              // 因为json数据和text/event-stream数据不同，json数据可以通过.访问chunk_message 的值，
              // 但是text/event-stream数据是个纯文本，不能通过.访问chunk_message，我们用正则表达式来获取需要的数据
              let pattern = /"content"\s*:\s*"([^"]*)"/;

              // 使用正则表达式进行匹配
              let match = resultData.match(pattern);

              if (match) {
                // 提取匹配到的值
                matchArr += match[1];
                // 将消息传递给回调函数处理
                chrome.runtime.sendMessage({
                  action: "modifyDiv",
                  value: matchArr,
                });
                chrome.storage.local.set({ answer: matchArr });
              } else {
                console.log("No chunk_message found");
              }
            }
          }
        } else {
          chrome.runtime.sendMessage({
            action: "modifyDiv",
            value: "Something Went Wrong",
          });
        }
      }
    });
  }
}
