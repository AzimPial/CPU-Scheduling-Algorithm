/**
 * @fileoverview Algo — Login/signup form logic.
 * Runs on login.html. Handles mode toggling, validation,
 * API calls, and redirect after auth.
 * @module ui/login
 */

import { setAuth, apiFetch, isLoggedIn } from '../core/api.js';

let isSignup = false;

const title = document.getElementById('login-title');
const subtitle = document.getElementById('login-subtitle');
const form = document.getElementById('login-form');
const usernameInput = document.getElementById('username-input');
const passwordInput = document.getElementById('password-input');
const newPasswordInput = document.getElementById('new-password-input');
const newPasswordGroup = document.getElementById('new-password-group');
const errorDiv = document.getElementById('login-error');
const submitBtn = document.getElementById('login-submit-btn');
const toggleLink = document.getElementById('login-toggle-link');
const toggleText = document.getElementById('login-toggle-text');

function showError(msg) {
  errorDiv.textContent = msg;
  errorDiv.style.display = msg ? 'block' : 'none';
}

function clearError() {
  errorDiv.textContent = '';
  errorDiv.style.display = 'none';
}

function setLoading(loading) {
  if (loading) {
    submitBtn.disabled = true;
    submitBtn.dataset.originalText = submitBtn.textContent;
    submitBtn.textContent = 'Please wait…';
  } else {
    submitBtn.disabled = false;
    submitBtn.textContent = submitBtn.dataset.originalText || (isSignup ? 'Create account' : 'Log in');
  }
}

function toggleMode() {
  isSignup = !isSignup;
  clearError();

  if (isSignup) {
    title.textContent = 'Create account';
    subtitle.textContent = 'Create a new account to get started.';
    submitBtn.textContent = 'Create account';
    toggleText.textContent = 'Already have an account?';
    toggleLink.textContent = 'Log in';
    newPasswordGroup.style.display = '';
    passwordInput.setAttribute('autocomplete', 'new-password');
  } else {
    title.textContent = 'Log in';
    subtitle.textContent = 'Welcome back. Enter your credentials to continue.';
    submitBtn.textContent = 'Log in';
    toggleText.textContent = "Don't have an account?";
    toggleLink.textContent = 'Create account';
    newPasswordGroup.style.display = 'none';
    newPasswordInput.value = '';
    passwordInput.setAttribute('autocomplete', 'current-password');
  }
}

function validateUsername(username) {
  if (username.length < 3 || username.length > 20) {
    return 'Username must be 3–20 characters long.';
  }
  if (!/^[a-zA-Z0-9]+$/.test(username)) {
    return 'Username must contain only letters and numbers.';
  }
  return null;
}

function validatePassword(password) {
  if (password.length < 6) {
    return 'Password must be at least 6 characters.';
  }
  return null;
}

async function handleSubmit(e) {
  e.preventDefault();
  clearError();

  const username = usernameInput.value.trim();
  const password = passwordInput.value;

  const usernameError = validateUsername(username);
  if (usernameError) {
    showError(usernameError);
    usernameInput.focus();
    return;
  }

  const passwordError = validatePassword(password);
  if (passwordError) {
    showError(passwordError);
    passwordInput.focus();
    return;
  }

  if (isSignup) {
    const confirm = newPasswordInput.value;
    if (confirm !== password) {
      showError('Passwords do not match.');
      newPasswordInput.focus();
      return;
    }
  }

  setLoading(true);

  const endpoint = isSignup ? '/api/auth/signup' : '/api/auth/login';
  const { data, error } = await apiFetch('POST', endpoint, { username, password });

  setLoading(false);

  if (error) {
    showError(error);
    return;
  }

  setAuth(data.token, data.username);

  const params = new URLSearchParams(window.location.search);
  const redirect = params.get('redirect') || 'index.html';
  window.location.href = redirect;
}

toggleLink.addEventListener('click', (e) => {
  e.preventDefault();
  toggleMode();
});

form.addEventListener('submit', handleSubmit);

if (isLoggedIn()) {
  const params = new URLSearchParams(window.location.search);
  const redirect = params.get('redirect') || 'index.html';
  window.location.href = redirect;
}
