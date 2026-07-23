import { register } from '../state.js';
import { navigate } from '../router.js';
import { ApiError } from '../api/client.js';

export async function render(container) {
  container.innerHTML = `
    <div class="form">
      <h1>Create your account</h1>
      <input id="username" type="text" placeholder="Username" autocomplete="username" />
      <input id="displayName" type="text" placeholder="Display name (optional)" />
      <input id="email" type="email" placeholder="Email" autocomplete="email" />
      <input id="password" type="password" placeholder="Password (min 8 characters)" autocomplete="new-password" />
      <p class="error" id="error" style="display:none"></p>
      <button class="btn-primary" id="submit">Create account</button>
      <button class="btn-link" id="go-login">Already have an account? Log in</button>
    </div>
  `;

  const errorEl = container.querySelector('#error');
  container.querySelector('#go-login').addEventListener('click', () => navigate('/login'));

  container.querySelector('#submit').addEventListener('click', async () => {
    const username = container.querySelector('#username').value.trim();
    const displayName = container.querySelector('#displayName').value.trim();
    const email = container.querySelector('#email').value.trim();
    const password = container.querySelector('#password').value;
    errorEl.style.display = 'none';
    try {
      await register(username, email, password, displayName || undefined);
      navigate('/feed');
    } catch (err) {
      errorEl.textContent = err instanceof ApiError ? err.message : 'Something went wrong. Try again.';
      errorEl.style.display = 'block';
    }
  });
}
