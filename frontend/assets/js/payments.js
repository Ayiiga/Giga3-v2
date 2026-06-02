async function buy(tokens) {
  const email = localStorage.getItem('user_email') || prompt('Enter email to receive tokens');
  if (!email) return alert('Email required');

  try {
    const data = await convexAction('payments:createCheckout', { email, tokens });
    window.location.href = data.url;
  } catch (err) {
    alert('Payment init failed: ' + (err.message || err));
  }
}

window.buy = buy;
