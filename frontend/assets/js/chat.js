function appendMessage(text, role = "assistant") {
  const messagesDiv = document.getElementById("messages");
  const el = document.createElement("div");
  el.className = `msg ${role}`;
  el.innerText = text;
  messagesDiv.appendChild(el);
  messagesDiv.scrollTop = messagesDiv.scrollHeight;
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
    const data = await convexAction("ai:askAI", { email, message });
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
