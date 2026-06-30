const convexUrl = window.GIGA3_CONFIG.CONVEX_URL;

async function buy(tokens) {
  const email = localStorage.getItem('user_email') || prompt('Enter email to receive tokens');
  if (!email) return alert('Email required');
  let sessionToken = localStorage.getItem('giga3_session_token');
  if (!sessionToken) {
    const bootstrap = await fetch(`${convexUrl}/api/mutation`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        path: 'users:createUser',
        args: { email },
        format: 'json',
      }),
    });
    const data = await bootstrap.json();
    sessionToken = data.value?.sessionToken;
    if (sessionToken) localStorage.setItem('giga3_session_token', sessionToken);
  }
  if (!sessionToken) return alert('Session required');

  try {
    const res = await fetch(`${convexUrl}/action/stripeActions:createCheckout`, {
      method: 'POST', headers: {'Content-Type':'application/json'}, body: JSON.stringify({ sessionToken, tokens })
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