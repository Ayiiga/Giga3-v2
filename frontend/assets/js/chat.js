const convexUrl = window.GIGA3_CONFIG.CONVEX_URL;

function appendMessage(text, role = "assistant") {
  const messagesDiv = document.getElementById("messages");
  const el = document.createElement("div");
  el.className = `msg ${role}`;
  el.innerText = text;
  messagesDiv.appendChild(el);
  messagesDiv.scrollTop = messagesDiv.scrollHeight;
}

function setLoadingHint(loadingWrap, seconds) {
  if (!loadingWrap) return;
  let hint = loadingWrap.querySelector(".network-hint");
  if (seconds < 8) return;
  if (!hint) {
    hint = document.createElement("p");
    hint.className = "network-hint";
    hint.style.cssText =
      "font-size:12px;color:rgba(255,255,255,0.55);margin-top:8px;max-width:280px;line-height:1.4;";
    loadingWrap.appendChild(hint);
  }
  hint.textContent =
    `Still thinking (${seconds}s) — on slower mobile networks this can take up to a minute. Keep this tab open.`;
}

async function send() {
  const input = document.getElementById("message");
  const sendBtn = document.getElementById("sendBtn");
  const email = localStorage.getItem("user_email");
  if (!email) {
    window.location.href = "login.html";
    return;
  }
  const message = input.value?.trim();
  if (!message) return;

  appendMessage(message, "user");
  input.value = "";

  const loader = document.createElement("div");
  loader.className = "loader";
  const messagesDiv = document.getElementById("messages");
  const loadingWrap = document.createElement("div");
  loadingWrap.className = "msg assistant";
  loadingWrap.appendChild(loader);
  const status = document.createElement("span");
  status.style.cssText = "margin-left:8px;font-size:12px;color:rgba(255,255,255,0.5);";
  status.textContent = "Thinking…";
  loadingWrap.appendChild(status);
  messagesDiv.appendChild(loadingWrap);
  messagesDiv.scrollTop = messagesDiv.scrollHeight;
  sendBtn.disabled = true;

  const started = Date.now();
  const tick = setInterval(() => {
    const s = Math.floor((Date.now() - started) / 1000);
    status.textContent = `Thinking · ${s}s`;
    setLoadingHint(loadingWrap, s);
  }, 1000);

  try {
    const data = await convexAction("ai:askAI", { email, message }, { timeoutMs: 90000 });
    loadingWrap.remove();
    appendMessage(data.content || "(no reply)", "assistant");
    document.getElementById("tokenCount").innerText = data.tokens ?? "-";
    document.getElementById("userEmail").innerText = email;
  } catch (err) {
    loadingWrap.remove();
    const msg = err.message || String(err);
    appendMessage(
      msg.includes("timed out")
        ? msg
        : "Error: " + msg + " — try again when your connection is stable.",
      "assistant"
    );
  } finally {
    clearInterval(tick);
    sendBtn.disabled = false;
  }
}

function ensureUser() {
  const email = localStorage.getItem("user_email");
  if (!email) {
    window.location.href = "login.html";
    return null;
  }
  document.getElementById("userEmail").innerText = email;
  document.getElementById("tokenCount").innerText = "-";
  return email;
}

document.addEventListener("DOMContentLoaded", async () => {
  const email = ensureUser();
  if (!email) return;
  await loadMessages(email);
});

async function loadMessages(email) {
  try {
    const msgs = await convexQuery("chat:getMessages", { userId: email });
    const messagesDiv = document.getElementById("messages");
    messagesDiv.innerHTML = "";
    msgs.forEach((m) => {
      appendMessage(m.message, m.role === "user" ? "user" : "assistant");
    });

    const user = await convexQuery("users:getUser", { email });
    document.getElementById("tokenCount").innerText = user?.tokens ?? "-";
  } catch (err) {
    console.warn("loadMessages error", err);
  }
}
