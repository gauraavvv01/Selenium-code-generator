// popup.js — Test Action Recorder UI

(async function () {
  // ── DOM refs ──────────────────────────────────────────────────────────────
  const btnToggle   = document.getElementById("btnToggle");
  const btnCopy     = document.getElementById("btnCopy");
  const btnClear    = document.getElementById("btnClear");
  const codeOutput  = document.getElementById("codeOutput");
  const emptyState  = document.getElementById("emptyState");
  const statusPill  = document.getElementById("statusPill");
  const statusText  = document.getElementById("statusText");
  const eventCount  = document.getElementById("eventCount");
  const header      = document.getElementById("header");
  const toast       = document.getElementById("toast");

  let recording = false;
  let currentCode = "";

  // ── Init: load state from background ─────────────────────────────────────
  chrome.runtime.sendMessage({ action: "TAR_GET_STATE" }, (res) => {
    if (!res) return;
    recording = res.recording;
    currentCode = res.code || "";
    eventCount.textContent = res.events ? res.events.length : 0;
    renderCode(currentCode);
    setUI(recording);
  });

  // ── Syntax highlighting ───────────────────────────────────────────────────
  function highlight(code) {
    if (!code) return "";

    return code
      // Comments
      .replace(/(\/\/[^\n]*)/g, '<span class="tok-comment">$1</span>')
      // require / const / await / async / function / try / finally / new
      .replace(/\b(require|const|await|async|function|try|finally|new|let|var)\b/g,
               '<span class="tok-keyword">$1</span>')
      // Strings in double or single quotes
      .replace(/("(?:[^"\\]|\\.)*"|'(?:[^'\\]|\\.)*')/g,
               '<span class="tok-string">$1</span>')
      // Method calls like .click() .sendKeys() .findElement() etc.
      .replace(/\.(click|sendKeys|findElement|quit|build|forBrowser|selectByValue)\b/g,
               '.<span class="tok-func">$1</span>')
      // By.css, By.id, etc.
      .replace(/\b(By|Builder|Select|Key)\b/g,
               '<span class="tok-method">$1</span>');
  }

  function renderCode(code) {
    if (!code || code.trim() === "") {
      codeOutput.style.display  = "none";
      emptyState.style.display  = "flex";
    } else {
      emptyState.style.display  = "none";
      codeOutput.style.display  = "block";
      codeOutput.innerHTML = highlight(code);
      // Auto-scroll to bottom
      codeOutput.scrollTop = codeOutput.scrollHeight;
    }
  }

  // ── UI state ──────────────────────────────────────────────────────────────
  function setUI(isRecording) {
    recording = isRecording;

    if (isRecording) {
      btnToggle.textContent = "⏹ Stop Recording";
      btnToggle.className   = "btn btn-stop";
      statusPill.className  = "status-pill active";
      statusText.textContent = "REC";
      header.className      = "header recording";
    } else {
      btnToggle.textContent = "▶ Start Recording";
      btnToggle.className   = "btn btn-record";
      statusPill.className  = "status-pill idle";
      statusText.textContent = "IDLE";
      header.className      = "header";
    }
  }

  // ── Toggle recording ──────────────────────────────────────────────────────
  btnToggle.addEventListener("click", () => {
    if (!recording) {
      chrome.runtime.sendMessage({ action: "TAR_START_RECORDING" }, () => {
        setUI(true);
      });
    } else {
      chrome.runtime.sendMessage({ action: "TAR_STOP_RECORDING" }, () => {
        setUI(false);
      });
    }
  });

  // ── Copy ──────────────────────────────────────────────────────────────────
  btnCopy.addEventListener("click", () => {
    if (!currentCode) return;
    navigator.clipboard.writeText(currentCode).then(() => showToast("✓ Copied!"));
  });

  // ── Clear ─────────────────────────────────────────────────────────────────
  btnClear.addEventListener("click", () => {
    chrome.runtime.sendMessage({ action: "TAR_CLEAR" }, () => {
      currentCode = "";
      eventCount.textContent = "0";
      renderCode("");
    });
  });

  // ── Listen for live updates from background ───────────────────────────────
  chrome.runtime.onMessage.addListener((msg) => {
    if (msg.action === "TAR_UPDATE") {
      currentCode = msg.code || "";
      eventCount.textContent = msg.events ? msg.events.length : 0;
      renderCode(currentCode);
    }
  });

  // ── Toast ─────────────────────────────────────────────────────────────────
  let toastTimer;
  function showToast(msg) {
    toast.textContent = msg;
    toast.classList.add("show");
    clearTimeout(toastTimer);
    toastTimer = setTimeout(() => toast.classList.remove("show"), 1800);
  }
})();
