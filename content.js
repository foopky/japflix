let tokenizer = null;
// 마지막 자막 저장
let lastSubtitle = "";
kuromoji
  .builder({ dicPath: chrome.runtime.getURL("dict") })
  .build((err, tk) => {
    if (err) {
      console.error("kuromoji Init failed:", err);
      return;
    }
    tokenizer = tk;
  });

const tokenizeJapanese = (text) => {
  try {
    const tokenized = tokenizer.tokenize(text);
    displayJapanese(tokenized);
  } catch {
    console.error("tokenizing failed.");
  }
};

/**
 * 단어 추가 모달 생성 및 표시
 */
function openAddWordModal(word) {
  const accessToken = getAccessToken();
  if (accessToken == null) {
    showLoginModal();
    return;
  }
  // 모달 중복 방지
  if (document.getElementById("add-word-modal-overlay")) return;

  const overlay = document.createElement("div");
  overlay.id = "add-word-modal-overlay";
  overlay.style.position = "fixed";
  overlay.style.top = "0";
  overlay.style.left = "0";
  overlay.style.width = "100%";
  overlay.style.height = "100%";
  overlay.style.background = "rgba(0,0,0,0.5)";
  overlay.style.display = "flex";
  overlay.style.justifyContent = "center";
  overlay.style.alignItems = "center";
  overlay.style.zIndex = 10001;
  overlay.style.pointerEvents = "auto";

  const modal = document.createElement("div");
  modal.style.width = "420px";
  modal.style.maxWidth = "95%";
  modal.style.maxHeight = "90vh"; // 모달 최대 높이 설정
  modal.style.background = "#fff";
  modal.style.borderRadius = "8px";
  modal.style.padding = "16px";
  modal.style.boxShadow = "0 6px 24px rgba(0,0,0,0.4)";
  modal.style.color = "#000";
  modal.style.overflow = "auto"; // 스크롤 허용

  const title = document.createElement("h3");
  title.textContent = "단어추가하기";
  title.style.marginTop = "0";
  modal.appendChild(title);

  const form = document.createElement("form");
  form.id = "add-word-form";

  // 필드 순서 보장을 위한 비동기 함수
  async function createFields() {
    const fields = [
      { name: "folder", label: "Folder" },
      { name: "language", label: "Language" },
      { name: "pos", label: "POS" },
      { name: "word", label: "Word" },
      { name: "meaning", label: "Meaning" },
      { name: "kundoku", label: "Kundoku" },
      { name: "ondoku", label: "Ondoku" },
      { name: "pronunciation", label: "Pronunciation" },
    ];

    // 순차적으로 필드 생성
    for (const f of fields) {
      const wrapper = document.createElement("div");
      wrapper.style.marginBottom = "8px";

      const lbl = document.createElement("label");
      lbl.textContent = f.label;
      lbl.htmlFor = `input-${f.name}`;
      lbl.style.display = "block";
      lbl.style.fontSize = "13px";
      lbl.style.marginBottom = "4px";

      if (f.label === "Folder") {
        try {
          const folders = await fetchFolders();
          const select = document.createElement("select");
          select.id = `input-${f.name}`;
          select.name = f.name;
          select.style.width = "100%";
          select.style.boxSizing = "border-box";
          select.style.padding = "6px 8px";
          select.style.border = "1px solid #ccc";
          select.style.borderRadius = "4px";
          select.style.position = "relative";
          select.style.zIndex = "10";

          if (folders && folders.length > 0) {
            folders.forEach((folder) => {
              const option = document.createElement("option");
              option.value = folder.id;
              option.textContent = folder.name;
              select.appendChild(option);
            });
          } else {
            const option = document.createElement("option");
            option.value = "";
            option.textContent = "폴더를 불러올 수 없음";
            select.appendChild(option);
          }

          wrapper.appendChild(lbl);
          wrapper.appendChild(select);
        } catch (error) {
          console.error("Folder Loading Failed:", error);
          // 실패 시 일반 입력 필드로 대체
          const input = document.createElement("input");
          input.type = "text";
          input.id = `input-${f.name}`;
          input.name = f.name;
          input.placeholder = "폴더 ID 직접 입력";
          input.style.width = "100%";
          input.style.boxSizing = "border-box";
          input.style.padding = "6px 8px";
          input.style.border = "1px solid #ccc";
          input.style.borderRadius = "4px";

          wrapper.appendChild(lbl);
          wrapper.appendChild(input);
        }
      } else {
        let input;
        if (f.name === "meaning") {
          input = document.createElement("textarea");
          input.rows = 3;
        } else {
          input = document.createElement("input");
          input.type = "text";
        }
        input.id = `input-${f.name}`;
        input.name = f.name;
        input.style.width = "100%";
        input.style.boxSizing = "border-box";
        input.style.padding = "6px 8px";
        input.style.border = "1px solid #ccc";
        input.style.borderRadius = "4px";

        // 미리 채워질 단어
        if (f.name === "word" && word.surface_form) {
          input.value = word.surface_form;
        } else if (f.name === "pos" && word.pos) {
          input.value = word.pos;
        } else if (f.name === "pronunciation" && word.pronunciation) {
          input.value = word.pronunciation;
        } else if (f.name === "language") {
          input.value = "japanese";
          input.readOnly = true;
          input.style.background = "#f0f0f0";
        }

        wrapper.appendChild(lbl);
        wrapper.appendChild(input);
      }

      form.appendChild(wrapper);
    }

    // 버튼 행 추가
    const btnRow = document.createElement("div");
    btnRow.style.display = "flex";
    btnRow.style.justifyContent = "flex-end";
    btnRow.style.gap = "8px";
    btnRow.style.marginTop = "16px";

    const cancelBtn = document.createElement("button");
    cancelBtn.type = "button";
    cancelBtn.textContent = "Cancel";
    cancelBtn.style.padding = "8px 12px";
    cancelBtn.onclick = () => overlay.remove();

    const saveBtn = document.createElement("button");
    saveBtn.type = "button";
    saveBtn.textContent = "Save";
    saveBtn.style.background = "#0078d4";
    saveBtn.style.color = "#fff";
    saveBtn.style.border = "none";
    saveBtn.style.padding = "8px 12px";
    saveBtn.style.borderRadius = "4px";
    saveBtn.onclick = async () => {
      const data = {};
      fields.forEach((f) => {
        const el = document.getElementById(`input-${f.name}`);
        data[f.name] = el ? el.value.trim() : "";
      });

      try {
        await saveWord(data.folder, {
          language: data.language,
          pos: data.pos,
          word: data.word,
          meaning: data.meaning,
          learned: false,
          kundoku: data.kundoku,
          ondoku: data.ondoku,
          pronunciation: data.pronunciation,
          example: null,
        });
        alert("Successfully saved the word!");
      } catch (e) {
        console.warn("Failed to save to server, saving locally:", e);
        const stored =
          (await chrome.storage.local.get({ myWords: [] })).myWords || [];
        stored.push(data);
        await chrome.storage.local.set({ myWords: stored });
      }

      overlay.remove();
    };

    btnRow.appendChild(cancelBtn);
    btnRow.appendChild(saveBtn);
    form.appendChild(btnRow);
  }

  // 비동기로 필드 생성 후 모달에 추가
  createFields().then(() => {
    modal.appendChild(form);
    overlay.appendChild(modal);
    document.body.appendChild(overlay);
  });
}

const displayJapanese = (arr) => {
  try {
    // ✅ 1. 기존 자막 div 제거 (같은 ID 사용)
    let el = document.getElementById("tokenized-japanese-sub");
    if (el) {
      el.remove();
    }

    // ✅ 2. 새 자막 div 생성
    el = document.createElement("div");
    el.id = "tokenized-japanese-sub"; // <-- 이름 통일
    el.style.position = "absolute";
    el.style.bottom = "20%";
    el.style.width = "100%";
    el.style.display = "flex";
    el.style.justifyContent = "center";
    el.style.flexWrap = "wrap"; // 줄바꿈 허용
    el.style.gap = "0px"; // 단어 간격
    el.style.zIndex = 9999;
    el.style.pointerEvents = "none";

    // ✅ 3. 각 단어 표시
    arr.forEach((element, index) => {
      if (element.word_type == "KNOWN" || element.pos == "名詞") {
        const word = document.createElement("div");
        word.id = `token-${index}`;
        word.textContent = element.surface_form;
        word.style.color = "white";
        word.style.fontSize = "24px";
        word.style.pointerEvents = "auto";
        word.style.padding = "4px 0px";
        word.style.position = "relative"; // 별 위치를 위해 relative로 설정

        // 마우스 올라가면 배경 및 + 버튼 생성 (절대 위치; 레이아웃 변경 없음)
        word.addEventListener("mouseenter", () => {
          // 레이아웃에 영향 주지 않도록 padding 변경 없음
          word.style.background = "rgba(0, 0, 0, 0.4)";
          word.style.borderRadius = "6px";
          word.style.cursor = "pointer";

          // 이미 +가 있으면 생성하지 않음 (word 내부에서 찾음)
          if (!word.querySelector(`#plus-${index}`)) {
            const plus = document.createElement("button");
            plus.id = `plus-${index}`;
            plus.type = "button";
            plus.textContent = "+";
            plus.title = "단어 추가";

            // + 버튼을 부모 내부에서 절대 위치로 위쪽에 띄움(레이아웃 변화 없음)
            plus.style.position = "absolute";
            plus.style.top = "-18px"; // 필요시 값 조정
            plus.style.left = "50%";
            plus.style.transform = "translateX(-50%)";
            plus.style.fontSize = "16px";
            plus.style.color = "#fff";
            plus.style.background = "rgba(0,0,0,0.6)";
            plus.style.border = "1px solid rgba(255,255,255,0.2)";
            plus.style.borderRadius = "50%";
            plus.style.width = "28px";
            plus.style.height = "28px";
            plus.style.display = "flex";
            plus.style.alignItems = "center";
            plus.style.justifyContent = "center";
            plus.style.pointerEvents = "auto";
            plus.style.cursor = "pointer";
            plus.style.userSelect = "none";

            // + 클릭시 모달 열기 (버튼 클릭과 단어 클릭 충돌 방지)
            plus.addEventListener("click", (e) => {
              e.stopPropagation();
              // 동영상 일시정지
              pauseVideo();
              openAddWordModal(element);
            });

            word.appendChild(plus);
          }
        });

        // 마우스 나가면 배경/+ 제거 (자식으로 이동 시 제거 방지)
        word.addEventListener("mouseleave", (e) => {
          if (word.contains(e.relatedTarget)) return; // + 버튼으로 이동하면 제거하지 않음
          word.style.background = "transparent";
          word.style.borderRadius = "0px";
          const plus = word.querySelector(`#plus-${index}`);
          if (plus) plus.remove();
        });

        // 단어 클릭시에도 모달 열기
        word.addEventListener("click", () => {
          // 동영상 일시정지
          pauseVideo();
          openAddWordModal(element);
        });

        word.style.textShadow = "2px 2px 4px black";
        el.appendChild(word);
      }
    });
    // ✅ 4. DOM에 추가
    document.body.appendChild(el);
  } catch (error) {
    console.error("Error occurred while creating tokenized subtitles: ", error);
  }
};

// 번역 API 호출 (실제 번역은 안 해도 일단 요청 구조까지 테스트)
const fetchTranslation = async (text) => {
  // 저장된 API 키/언어 불러오기
  const { apiKey, targetLang } = await chrome.storage.local.get([
    "apiKey",
    "targetLang",
  ]);

  if (!apiKey) {
    console.warn("❌ API key is missing (set it in popup.html)");
    return "[API key missing]";
  }

  try {
    const response = await fetch("https://api.openai.com/v1/chat/completions", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${apiKey}`,
      },
      body: JSON.stringify({
        model: "gpt-4.1-mini",
        messages: [
          {
            role: "system",
            content: `You are a professional translator. Translate into ${targetLang}. Only return the translated sentence.`,
          },
          { role: "user", content: text },
        ],
        max_tokens: 60,
        temperature: 0.3,
      }),
    });

    const data = await response.json();
    return data.choices?.[0]?.message?.content || "[Translation failed]";
  } catch (e) {
    console.error("OpenAI API call failed", e);
    return "[Translation error]";
  }
};

// 자막 출력용 div 생성
const displayTranslation = (text) => {
  let el = document.getElementById("ai-subtitle-debug");
  if (!el) {
    el = document.createElement("div");
    el.id = "ai-subtitle-debug";
    el.style.position = "absolute";
    el.style.bottom = "12%";
    el.style.width = "100%";
    el.style.textAlign = "center";
    el.style.color = "lime";
    el.style.fontSize = "20px";
    el.style.zIndex = 9999;
    el.style.textShadow = "2px 2px 4px black";
    el.style.pointerEvents = "none";
    document.body.appendChild(el);
  }
  el.textContent = text;
};

const observeSubtitles = (target) => {
  observer = new MutationObserver(async () => {
    const text = target.innerText.trim();
    target.style.display = "none";
    if (text && text !== lastSubtitle) {
      lastSubtitle = text;
      tokenizeJapanese(text);
      const translation = await fetchTranslation(text);
      displayTranslation(translation);
    }
  });

  observer.observe(target, { childList: true, subtree: true });
};

// show login button on the page when access token is missing
function showLoginSignInButton() {
  if (document.getElementById("extension-login-btn")) return;
  if (document.getElementById("extension-signin-btn")) return;
  const loginBtn = document.createElement("button");
  loginBtn.id = "extension-login-btn";
  loginBtn.textContent = "Log in to VocaWeb";
  loginBtn.style.position = "fixed";
  loginBtn.style.top = "20px";
  loginBtn.style.right = "500px";
  loginBtn.style.zIndex = "100000";
  loginBtn.style.padding = "8px 12px";
  loginBtn.style.background = "#0078d4";
  loginBtn.style.color = "#fff";
  loginBtn.style.border = "none";
  loginBtn.style.borderRadius = "6px";
  loginBtn.style.cursor = "pointer";
  loginBtn.style.fontSize = "14px";
  loginBtn.style.fontWeight = "bold";
  loginBtn.style.boxShadow = "0 2px 8px rgba(0,0,0,0.3)";

  const signupBtn = document.createElement("button");
  signupBtn.id = "extension-signup-btn";
  signupBtn.textContent = "Sign up to VocaWeb";
  signupBtn.style.position = "fixed";
  signupBtn.style.top = "20px";
  signupBtn.style.right = "300px";
  signupBtn.style.zIndex = "100000";
  signupBtn.style.padding = "8px 12px";
  signupBtn.style.background = "#0078d4";
  signupBtn.style.color = "#fff";
  signupBtn.style.border = "none";
  signupBtn.style.borderRadius = "6px";
  signupBtn.style.cursor = "pointer";
  signupBtn.style.fontSize = "14px";
  signupBtn.style.fontWeight = "bold";
  signupBtn.style.boxShadow = "0 2px 8px rgba(0,0,0,0.3)";

  loginBtn.addEventListener("click", () => {
    showLoginModal();
  });

  signupBtn.addEventListener("click", () => {
    window.open("https://vocawebvercel.vercel.app/signup", "_blank");
  });

  document.body.appendChild(loginBtn);
  document.body.appendChild(signupBtn);
}

// show login modal form when login button is clicked
function showLoginModal() {
  if (document.getElementById("extension-login-modal")) return;

  const overlay = document.createElement("div");
  overlay.id = "extension-login-modal";
  overlay.style.position = "fixed";
  overlay.style.inset = "0";
  overlay.style.display = "flex";
  overlay.style.alignItems = "center";
  overlay.style.justifyContent = "center";
  overlay.style.background = "rgba(0,0,0,0.6)";
  overlay.style.zIndex = "100001";
  overlay.style.pointerEvents = "auto";

  const modal = document.createElement("div");
  modal.style.width = "360px";
  modal.style.maxWidth = "95%";
  modal.style.padding = "16px";
  modal.style.background = "#fff";
  modal.style.borderRadius = "8px";
  modal.style.boxShadow = "0 6px 24px rgba(0,0,0,0.4)";
  modal.style.color = "#000";

  const title = document.createElement("h3");
  title.textContent = "If you want to use VocaWeb, please log in.";
  title.style.margin = "0 0 12px 0";
  title.style.textAlign = "center";
  modal.appendChild(title);

  const form = document.createElement("form");
  form.addEventListener("submit", (e) => e.preventDefault());

  const userInput = document.createElement("input");
  userInput.type = "text";
  userInput.placeholder = "Username";
  userInput.style.width = "100%";
  userInput.style.padding = "8px";
  userInput.style.marginBottom = "8px";
  userInput.style.border = "1px solid #ccc";
  userInput.style.borderRadius = "4px";
  userInput.style.boxSizing = "border-box";
  form.appendChild(userInput);

  const passInput = document.createElement("input");
  passInput.type = "password";
  passInput.placeholder = "Password";
  passInput.style.width = "100%";
  passInput.style.padding = "8px";
  passInput.style.marginBottom = "12px";
  passInput.style.border = "1px solid #ccc";
  passInput.style.borderRadius = "4px";
  passInput.style.boxSizing = "border-box";
  form.appendChild(passInput);

  const errorMsg = document.createElement("div");
  errorMsg.style.color = "red";
  errorMsg.style.fontSize = "12px";
  errorMsg.style.marginBottom = "12px";
  errorMsg.style.textAlign = "center";
  errorMsg.style.minHeight = "16px";
  form.appendChild(errorMsg);

  const btnRow = document.createElement("div");
  btnRow.style.display = "flex";
  btnRow.style.gap = "8px";

  const cancelBtn = document.createElement("button");
  cancelBtn.type = "button";
  cancelBtn.textContent = "Cancel";
  cancelBtn.style.flex = "1";
  cancelBtn.style.padding = "8px";
  cancelBtn.style.background = "#e0e0e0";
  cancelBtn.style.border = "none";
  cancelBtn.style.borderRadius = "4px";
  cancelBtn.style.cursor = "pointer";
  cancelBtn.addEventListener("click", () => {
    overlay.remove();
  });

  const loginBtn = document.createElement("button");
  loginBtn.type = "submit";
  loginBtn.textContent = "Log in";
  loginBtn.style.flex = "1";
  loginBtn.style.padding = "8px";
  loginBtn.style.background = "#0078d4";
  loginBtn.style.color = "#fff";
  loginBtn.style.border = "none";
  loginBtn.style.borderRadius = "4px";
  loginBtn.style.cursor = "pointer";

  // 로그인 처리
  const handleLogin = async () => {
    const username = userInput.value.trim();
    const password = passInput.value.trim();

    if (!username || !password) {
      errorMsg.textContent = "Please enter both username and password.";
      return;
    }

    loginBtn.disabled = true;
    loginBtn.textContent = "Logging in...";
    errorMsg.textContent = "";

    try {
      // fetchUserInfo 함수가 user.js에 있다고 가정
      if (typeof fetchUserInfo === "function") {
        await fetchUserInfo(username, password);

        // 로그인 성공 확인
        const token = getAccessToken();
        if (token) {
          overlay.remove();
          // 로그인 버튼 제거
          const existingBtn = document.getElementById("extension-login-btn");
          if (existingBtn) existingBtn.remove();
          console.log("Login successful!");
        } else {
          errorMsg.textContent = "Login failed.";
        }
      } else {
        errorMsg.textContent = "Login function not found.";
      }
    } catch (error) {
      console.error("Login error:", error);
      errorMsg.textContent = "An error occurred during login.";
    } finally {
      loginBtn.disabled = false;
      loginBtn.textContent = "Log in to VocaWeb";
    }
  };

  loginBtn.addEventListener("click", handleLogin);
  form.addEventListener("submit", handleLogin);

  btnRow.appendChild(cancelBtn);
  btnRow.appendChild(loginBtn);
  form.appendChild(btnRow);
  modal.appendChild(form);
  overlay.appendChild(modal);
  document.body.appendChild(overlay);

  // 첫 번째 입력 필드에 포커스
  userInput.focus();
}

function showVocaWebButton() {
  if (document.getElementById("extension-vocaweb-btn")) return;
  const btn = document.createElement("button");
  btn.id = "extension-vocaweb-btn";
  btn.textContent = "Go to VocaWeb";
  btn.style.position = "fixed";
  btn.style.top = "20px";
  btn.style.right = "400px";
  btn.style.zIndex = "100000";
  btn.style.padding = "8px 12px";
  btn.style.background = "#0078d4";
  btn.style.color = "#fff";
  btn.style.border = "none";
  btn.style.borderRadius = "6px";
  btn.style.cursor = "pointer";
  btn.style.fontSize = "14px";
  btn.style.fontWeight = "bold";
  btn.style.boxShadow = "0 2px 8px rgba(0,0,0,0.3)";
  document.body.appendChild(btn);
  btn.addEventListener("click", () => {
    window.open("https://vocawebvercel.vercel.app", "_blank");
  });
}

// startObserverLoop에서 토큰 없으면 로그인 버튼 표시
const startObserverLoop = () => {
  setInterval(() => {
    const target = document.querySelector(".player-timedtext");
    if (target && !target.dataset.observed) {
      target.dataset.observed = "true";
      observeSubtitles(target);
    }

    // 토큰이 없으면 로그인 버튼 표시
    try {
      const token = getAccessToken();
      if (!token) {
        document.getElementById("extension-vocaweb-btn")?.remove();
        showLoginSignInButton();
      } else {
        // 토큰이 있으면 로그인 버튼 제거
        document.getElementById("extension-login-btn")?.remove();
        document.getElementById("extension-signin-btn")?.remove();
        showVocaWebButton();
      }
    } catch (e) {
      console.warn("Failed to call getAccessToken:", e);
    }
  }, 1000);
};

startObserverLoop();

// 넷플릭스 동영상 일시정지 함수
function pauseVideo() {
  try {
    // 넷플릭스 비디오 요소 찾기 (여러 셀렉터 시도)
    const video =
      document.querySelector("video") ||
      document.querySelector(".VideoContainer video") ||
      document.querySelector('[data-uia="video-canvas"] video');

    if (video && !video.paused) {
      video.pause();
      return;
    }

    // 넷플릭스 플레이어 컨트롤 버튼으로 일시정지 시도
    const playButton =
      document.querySelector('[data-uia="control-play-pause-button"]') ||
      document.querySelector(".button-nfplayerPlay") ||
      document.querySelector(
        '.PlayerControls--control-element[aria-label*="일시정지"]'
      ) ||
      document.querySelector(
        '.PlayerControls--control-element[aria-label*="Pause"]'
      );

    if (playButton) {
      // 현재 재생 중인지 확인 (aria-label 또는 클래스로)
      const isPlaying =
        playButton.getAttribute("aria-label")?.includes("일시정지") ||
        playButton.getAttribute("aria-label")?.includes("Pause") ||
        playButton.querySelector('svg[class*="play"]');

      if (isPlaying) {
        playButton.click();
        return;
      }
    }

    // 스페이스바 키 이벤트로 일시정지 (폴백)
    document.dispatchEvent(
      new KeyboardEvent("keydown", {
        key: " ",
        code: "Space",
        keyCode: 32,
        which: 32,
        bubbles: true,
      })
    );
  } catch (error) {
    console.warn("Netflix video pause failed:", error);
  }
}
