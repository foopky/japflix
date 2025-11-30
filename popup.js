document.addEventListener("DOMContentLoaded", () => {
  console.log("popup loaded");

  const apiKeyInput = document.getElementById("apiKey");
  const langSelect = document.getElementById("targetLang");
  const saveBtn = document.getElementById("saveBtn");
  const openExamBtn = document.getElementById("openExam");

  chrome.storage.local.get(["apiKey", "targetLang"], (data) => {
    apiKeyInput.value = data.apiKey || "";
    langSelect.value = data.targetLang || "ko";
  });

  if (!saveBtn || !openExamBtn) {
    console.error("popup elements not found");
    return;
  }

  saveBtn.addEventListener("click", () => {
    console.log("saveBtn clicked");
    chrome.storage.local.set(
      {
        apiKey: apiKeyInput.value,
        targetLang: langSelect.value,
      },
      () => {
        console.log("saved to storage");
        alert("저장되었습니다!");
      }
    );
  });

  openExamBtn.addEventListener("click", async () => {
    console.log("openExam clicked");
    const targetUrl = "https://vocawebvercel.vercel.app/";

    if (
      window.chrome &&
      chrome.tabs &&
      typeof chrome.tabs.create === "function"
    ) {
      chrome.tabs.create({ url: targetUrl }, (tab) => {
        if (chrome.runtime.lastError) {
          console.error("chrome.tabs.create error:", chrome.runtime.lastError);
          window.open(targetUrl, "_blank");
        } else {
          console.log("tab created:", tab);
        }
      });
    } else {
      console.warn("chrome.tabs unavailable — falling back to window.open");
      window.open(targetUrl, "_blank");
    }
  });
});
