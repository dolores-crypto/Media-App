import { login } from '../state.js';
import { navigate } from '../router.js';
import { ApiError } from '../api/client.js';

export async function render(container) {
  container.innerHTML = `
    <div class="form">
      <h1>Media-App</h1>
      <p class="form-subtitle">Track what you read, watch, and listen to.</p>
      <input id="email" type="email" placeholder="Email" autocomplete="username" />
      <input id="password" type="password" placeholder="Password" autocomplete="current-password" />
      <p class="error" id="error" style="display:none"></p>
      <button class="btn-primary" id="submit">Log in</button>
      <button class="btn-link" id="go-register">New here? Create an account</button>
    </div>
  `;

  const errorEl = container.querySelector('#error');

  container.querySelector('#go-register').addEventListener('click', () => navigate('/register'));

  container.querySelector('#submit').addEventListener('click', async () => {
    const email = container.querySelector('#email').value.trim();
    const password = container.querySelector('#password').value;
    errorEl.style.display = 'none';
    try {
      await login(email, password);
      navigate('/feed');
    } catch (err) {
      errorEl.textContent = err instanceof ApiError ? err.message : 'Something went wrong. Try again.';
      errorEl.style.display = 'block';
    }
  });
}
