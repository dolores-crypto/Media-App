import { getAuthToken, setAuthToken } from './api/client.js';
import { AuthApi } from './api/resources.js';

let currentUser = null;
let isLoading = true;
const listeners = new Set();

function emit() {
  for (const fn of listeners) fn(getState());
}

export function getState() {
  return { user: currentUser, isLoading };
}

export function subscribe(fn) {
  listeners.add(fn);
  return () => listeners.delete(fn);
}

export async function initAuth() {
  const token = getAuthToken();
  if (token) {
    try {
      currentUser = await AuthApi.me();
    } catch {
      setAuthToken(null);
      currentUser = null;
    }
  }
  isLoading = false;
  emit();
}

export async function login(email, password) {
  const res = await AuthApi.login({ email, password });
  setAuthToken(res.token);
  currentUser = res.user;
  emit();
}

export async function register(username, email, password, displayName) {
  const res = await AuthApi.register({ username, email, password, displayName });
  setAuthToken(res.token);
  currentUser = res.user;
  emit();
}

export function logout() {
  setAuthToken(null);
  currentUser = null;
  emit();
}

export async function refreshUser() {
  currentUser = await AuthApi.me();
  emit();
}
