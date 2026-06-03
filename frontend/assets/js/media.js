const convexUrl = window.GIGA3_CONFIG.CONVEX_URL;

function ensureAuth() {
  const email = localStorage.getItem("user_email");
  if (!email) {
    window.location.href = "login.html";
    return null;
  }
  document.getElementById("userEmail").textContent = email;
  return email;
}

async function refreshTokens(email) {
  try {
    const res = await fetch(`${convexUrl}/query/users:getUser`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ email }),
    });
    if (res.ok) {
      const user = await res.json();
      document.getElementById("tokenCount").textContent = user?.tokens ?? "-";
    }
  } catch (e) {
    console.warn(e);
  }
}

function setLoading(btnId, loading) {
  const btn = document.getElementById(btnId);
  if (btn) btn.disabled = loading;
}

async function generateVideo() {
  const email = ensureAuth();
  if (!email) return;

  const imageUrl = document.getElementById("imageUrl").value?.trim();
  const prompt = document.getElementById("videoPrompt").value?.trim();
  if (!imageUrl || !prompt) {
    alert("Image URL and prompt are required.");
    return;
  }

  const body = { email, prompt, imageUrl };
  const w = document.getElementById("videoWidth").value;
  const h = document.getElementById("videoHeight").value;
  if (w && h) {
    body.imageSize = { width: Number(w), height: Number(h) };
  }
  const nf = document.getElementById("numFrames").value;
  const fps = document.getElementById("fps").value;
  const steps = document.getElementById("steps").value;
  const guidance = document.getElementById("guidance").value;
  if (nf) body.numFrames = Number(nf);
  if (fps) body.framesPerSecond = Number(fps);
  if (steps) body.numInferenceSteps = Number(steps);
  if (guidance) body.guidanceScale = Number(guidance);

  const out = document.getElementById("videoResult");
  out.innerHTML = "<p>Generating video (this may take several minutes)…</p>";
  setLoading("videoBtn", true);

  try {
    const res = await fetch(`${convexUrl}/action/media:generateVideo`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(body),
    });
    const text = await res.text();
    if (!res.ok) throw new Error(text || "Video generation failed");
    const data = JSON.parse(text);
    document.getElementById("tokenCount").textContent = data.tokens ?? "-";
    out.innerHTML = `
      <p>Seed: ${data.seed}</p>
      <video controls style="max-width:100%;border-radius:8px;" src="${data.videoUrl}"></video>
      <p><a href="${data.videoUrl}" target="_blank" rel="noopener">Download MP4</a></p>
    `;
  } catch (err) {
    out.innerHTML = `<p style="color:#ff6b6b;">${err.message || err}</p>`;
  } finally {
    setLoading("videoBtn", false);
  }
}

async function generateImage() {
  const email = ensureAuth();
  if (!email) return;

  const prompt = document.getElementById("imagePrompt").value?.trim();
  if (!prompt) {
    alert("Prompt is required.");
    return;
  }

  const out = document.getElementById("imageResult");
  out.innerHTML = "<p>Generating image…</p>";
  setLoading("imageBtn", true);

  try {
    const res = await fetch(`${convexUrl}/action/media:generateImage`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ email, prompt }),
    });
    const text = await res.text();
    if (!res.ok) throw new Error(text || "Image generation failed");
    const data = JSON.parse(text);
    document.getElementById("tokenCount").textContent = data.tokens ?? "-";
    out.innerHTML = `
      <img alt="Generated" style="max-width:100%;border-radius:8px;" src="${data.imageUrl}" />
      <p><a href="${data.imageUrl}" target="_blank" rel="noopener">Open image</a></p>
    `;
  } catch (err) {
    out.innerHTML = `<p style="color:#ff6b6b;">${err.message || err}</p>`;
  } finally {
    setLoading("imageBtn", false);
  }
}

document.addEventListener("DOMContentLoaded", async () => {
  const email = ensureAuth();
  if (email) await refreshTokens(email);
});
