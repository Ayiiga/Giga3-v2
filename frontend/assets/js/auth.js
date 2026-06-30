const convexUrl = window.GIGA3_CONFIG.CONVEX_URL;

async function login() {
  const email = document.getElementById("email").value.trim().toLowerCase();
  if (!email || !email.includes("@")) return alert("Enter a valid email");

  try {
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
    const user = data.value ?? data;
    if (user?.sessionToken) {
      localStorage.setItem("giga3_session_token", user.sessionToken);
    }
  } catch (err) {
    console.warn("createUser failed", err);
  }

  localStorage.setItem("user_email", email);
  localStorage.setItem("giga3_user_email", email);
  window.location.href = "dashboard.html";
}

function logout() {
  localStorage.removeItem("user_email");
  localStorage.removeItem("giga3_user_email");
  localStorage.removeItem("giga3_session_token");
  localStorage.removeItem("giga3_supabase_access_token");
  window.location.href = "index.html";
}

function getSessionToken() {
  return localStorage.getItem("giga3_session_token");
}
