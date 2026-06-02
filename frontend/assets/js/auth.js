async function login() {
  const email = document.getElementById("email").value.trim();
  if (!email || !email.includes("@")) return alert("Enter a valid email");

  try {
    await convexMutation("users:createUser", { email });
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
