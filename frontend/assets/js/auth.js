const convexUrl = window.GIGA3_CONFIG.CONVEX_URL;

async function login() {
  const email = document.getElementById("email").value.trim();
  if (!email || !email.includes("@")) return alert("Enter a valid email");

  // create user on Convex (idempotent)
  try {
    await fetch(`${convexUrl}/action/users:createUser`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ email }),
    });
  } catch (err) {
    console.warn("createUser failed", err);
  }

  localStorage.setItem("user_email", email);
  window.location.href = "dashboard.html";
}

function logout() {
  localStorage.removeItem("user_email");
  window.location.href = "index.html";
}