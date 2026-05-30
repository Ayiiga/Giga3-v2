const convexUrl = window.GIGA3_CONFIG.CONVEX_URL;

async function buy(tokens) {
  const email = localStorage.getItem('user_email') || prompt('Enter email to receive tokens');
  if (!email) return alert('Email required');

  try {
    const res = await fetch(`${convexUrl}/action/payments:createCheckout`, {
      method: 'POST', headers: {'Content-Type':'application/json'}, body: JSON.stringify({ email, tokens })
    });
    if (!res.ok) throw new Error(await res.text());
    const data = await res.json();
    // redirect to Stripe Checkout
    window.location.href = data.url;
  } catch (err) {
    alert('Payment init failed: ' + (err.message || err));
  }
}

window.buy = buy;