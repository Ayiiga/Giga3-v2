const convexUrl = window.GIGA3_CONFIG.CONVEX_URL;

function appendMessage(text, role = "assistant") {
  const messagesDiv = document.getElementById("messages");
  const el = document.createElement("div");
  el.className = `msg ${role}`;
  el.innerText = text;
  messagesDiv.appendChild(el);
  messagesDiv.scrollTop = messagesDiv.scrollHeight;
}

async function ensureLegacySession(email) {
  let token = localStorage.getItem("giga3_session_token");
  if (token) return token;
  const res = await fetch(`${convexUrl}/api/mutation`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      path: "users:createUser",
      args: { email },
      format: "json",
    }),
  });
  const data = await res.json();
  token = data.value?.sessionToken;
  if (token) localStorage.setItem("giga3_session_token", token);
  return token;
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
  messagesDiv.appendChild(loadingWrap);
  messagesDiv.scrollTop = messagesDiv.scrollHeight;
  sendBtn.disabled = true;

  try {
    const sessionToken = await ensureLegacySession(email);
    if (!sessionToken) throw new Error("Session expired. Please sign in again.");

    const res = await fetch(`${convexUrl}/api/action`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        path: "aiActions:askAI",
        args: { sessionToken, message },
        format: "json",
      }),
    });

    const payload = await res.json();
    if (payload.status === "error") {
      throw new Error(payload.errorMessage || "Server error");
    }
    const data = payload.value ?? payload;

    loadingWrap.remove();
    appendMessage(data.content || "(no reply)", "assistant");
    document.getElementById("tokenCount").innerText = data.tokens ?? "-";
    document.getElementById("userEmail").innerText = email;
  } catch (err) {
    loadingWrap.remove();
    appendMessage("Error: " + (err.message || err), "assistant");
  } finally {
    sendBtn.disabled = false;
  }
}
