const authForm = document.querySelector('[data-auth-form]');
const authMessage = document.querySelector('[data-auth-message]');

authForm?.addEventListener('submit', async (event) => {
  event.preventDefault();
  const formData = new FormData(authForm);
  const email = String(formData.get('email') || '').trim();
  const name = String(formData.get('name') || '').trim();
  const password = String(formData.get('password') || '');
  const button = authForm.querySelector('button[type="submit"]');
  button.disabled = true;
  authForm.setAttribute('aria-busy', 'true');
  authMessage.textContent = name ? 'Membuat akun...' : 'Memeriksa akun...';
  authMessage.className = 'auth-message';
  try {
    const response = await fetch(authForm.elements.name ? '/api/signup' : '/api/signin', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ email, password, name }) });
    const result = await response.json();
    if (!response.ok) throw new Error(result.error || 'Akun belum bisa diakses.');
    localStorage.removeItem('radius_session');
    window.location.href = result.user.role === 'ADMIN' ? '/admin.html?v=1' : '/account.html?v=8';
  } catch (error) {
    authMessage.textContent = error.message === 'Failed to fetch' ? 'Koneksi ke server terputus. Coba lagi.' : error.message;
    authMessage.className = 'auth-message auth-error';
    button.disabled = false;
    authForm.removeAttribute('aria-busy');
  }
});
