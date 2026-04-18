// content.js — Test Action Recorder
// Injected into pages to capture click and input events

(function () {
  if (window.__tarInjected) return;
  window.__tarInjected = true;

  let isRecording = false;
  let lastInputTarget = null;
  let lastInputValue = "";

  // ─── Selector Logic ───────────────────────────────────────────────────────

  function getSelector(el) {
    if (!el || el.nodeType !== 1) return null;

    // 1. ID
    if (el.id && el.id.trim() !== "") {
      return `#${CSS.escape(el.id)}`;
    }

    // 2. name attribute
    const name = el.getAttribute("name");
    if (name && name.trim() !== "") {
      return `[name="${name}"]`;
    }

    // 3. tag + meaningful classes (filter utility noise)
    const tag = el.tagName.toLowerCase();
    const classes = Array.from(el.classList)
      .filter((c) => c.length > 1 && !/^\d/.test(c))
      .slice(0, 2)
      .join(".");

    if (classes) return `${tag}.${classes}`;

    // 4. Bare tag (last resort)
    return tag;
  }

  // ─── Event Handlers ───────────────────────────────────────────────────────

  function handleClick(e) {
    if (!isRecording) return;

    const target = e.target;
    const tag = target.tagName.toLowerCase();

    // Skip invisible / decorative elements
    if (["html", "body", "script", "style"].includes(tag)) return;

    // If this click is on an input we just tracked a change for, skip
    if (target === lastInputTarget) return;

    const selector = getSelector(target);
    if (!selector) return;

    sendEvent({ type: "click", selector, tag });
  }

  function handleChange(e) {
    if (!isRecording) return;

    const target = e.target;
    const tag = target.tagName.toLowerCase();

    if (!["input", "textarea", "select"].includes(tag)) return;

    const selector = getSelector(target);
    if (!selector) return;

    const value = target.value || "";

    if (tag === "select") {
      sendEvent({ type: "select", selector, tag, value });
    } else {
      // Only send if value actually changed
      if (target === lastInputTarget && value === lastInputValue) return;
      lastInputTarget = target;
      lastInputValue = value;
      sendEvent({ type: "input", selector, tag, value });
    }
  }

  function handleBlur(e) {
    if (!isRecording) return;
    const target = e.target;
    const tag = target.tagName.toLowerCase();
    if (!["input", "textarea"].includes(tag)) return;

    const selector = getSelector(target);
    if (!selector) return;

    const value = target.value || "";
    if (value !== "") {
      sendEvent({ type: "input", selector, tag, value });
    }

    lastInputTarget = null;
    lastInputValue = "";
  }

  // ─── Messaging ───────────────────────────────────────────────────────────

  function sendEvent(event) {
    chrome.runtime.sendMessage({ action: "TAR_EVENT", event }).catch(() => {});
  }

  function attachListeners() {
    document.addEventListener("click", handleClick, true);
    document.addEventListener("change", handleChange, true);
    document.addEventListener("blur", handleBlur, true);
  }

  function detachListeners() {
    document.removeEventListener("click", handleClick, true);
    document.removeEventListener("change", handleChange, true);
    document.removeEventListener("blur", handleBlur, true);
    lastInputTarget = null;
    lastInputValue = "";
  }

  // ─── Listen for commands from popup ──────────────────────────────────────

  chrome.runtime.onMessage.addListener((msg, _sender, sendResponse) => {
    if (msg.action === "TAR_START") {
      isRecording = true;
      attachListeners();
      sendResponse({ ok: true });
    } else if (msg.action === "TAR_STOP") {
      isRecording = false;
      detachListeners();
      sendResponse({ ok: true });
    } else if (msg.action === "TAR_PING") {
      sendResponse({ recording: isRecording });
    }
  });

  // Restore state if popup was closed and reopened
  chrome.storage.local.get("tarRecording", ({ tarRecording }) => {
    if (tarRecording) {
      isRecording = true;
      attachListeners();
    }
  });
})();
