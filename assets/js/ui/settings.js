/**
 * @fileoverview Algo — Settings modal.
 * Creates and manages the settings overlay with appearance,
 * behavior, and account sections.
 * @module ui/settings
 */

import { getSettings, updateSettings, resetSettings } from '../core/settings.js';
import { apiFetch, isLoggedIn, getUsername, clearAuth } from '../core/api.js';

let currentOverlay = null;
let escHandler = null;

function radioGroup(name, options, current) {
  return `<div class="radio-group">${options.map(o =>
    `<label class="radio-option"><input type="radio" name="${name}" value="${o.value}" ${o.value === current ? 'checked' : ''}> ${o.label}</label>`
  ).join('')}</div>`;
}

function toggleSwitch(checked) {
  return `<label class="toggle"><input type="checkbox" ${checked ? 'checked' : ''}><span class="toggle-slider"></span></label>`;
}

function sectionHeading(text) {
  return `<h4 style="margin:20px 0 10px;font-size:12px;text-transform:uppercase;color:var(--text-muted);letter-spacing:0.5px;border-bottom:1px solid var(--border-color);padding-bottom:8px">${text}</h4>`;
}

function settingRow(label, control) {
  return `<div style="display:flex;align-items:center;justify-content:space-between;padding:8px 0"><span style="font-size:14px;color:var(--text-primary)">${label}</span>${control}</div>`;
}

function applyThemeFromSettings(theme) {
  const resolved = theme === 'system'
    ? (window.matchMedia('(prefers-color-scheme: dark)').matches ? 'dark' : 'light')
    : theme;
  document.documentElement.setAttribute('data-theme', resolved);
  localStorage.setItem('algo_theme', resolved);
  try {
    const themeBtn = document.getElementById('btn-theme');
    if (themeBtn) {
      if (resolved === 'dark') {
        themeBtn.innerHTML = '<svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><circle cx="12" cy="12" r="5"/><line x1="12" y1="1" x2="12" y2="3"/><line x1="12" y1="21" x2="12" y2="23"/><line x1="4.22" y1="4.22" x2="5.64" y2="5.64"/><line x1="18.36" y1="18.36" x2="19.78" y2="19.78"/><line x1="1" y1="12" x2="3" y2="12"/><line x1="21" y1="12" x2="23" y2="12"/><line x1="4.22" y1="19.78" x2="5.64" y2="18.36"/><line x1="18.36" y1="5.64" x2="19.78" y2="4.22"/></svg>';
        themeBtn.setAttribute('aria-label', 'Switch to light theme');
      } else {
        themeBtn.innerHTML = '<svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M21 12.79A9 9 0 1 1 11.21 3 7 7 0 0 0 21 12.79z"/></svg>';
        themeBtn.setAttribute('aria-label', 'Switch to dark theme');
      }
    }
  } catch {}
}

function applyColorblindPalette(enabled) {
  if (enabled) {
    document.body.classList.add('colorblind');
  } else {
    document.body.classList.remove('colorblind');
  }
}

/**
 * Create and show the settings modal.
 */
export function showSettingsModal() {
  closeSettingsModal();

  const settings = getSettings();

  const overlay = document.createElement('div');
  overlay.className = 'modal-overlay';
  overlay.innerHTML = `
    <div class="modal-content" role="dialog" aria-labelledby="settings-title" aria-modal="true" style="max-width:520px">
      <div style="display:flex;align-items:center;justify-content:space-between;margin-bottom:20px">
        <h3 id="settings-title" style="margin:0;font-size:18px">Settings</h3>
        <button class="btn-icon settings-close-btn" aria-label="Close">
          <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/></svg>
        </button>
      </div>

      <div class="settings-body">
        ${sectionHeading('Appearance')}

        ${settingRow('Theme', radioGroup('theme', [
          { value: 'light', label: 'Light' },
          { value: 'dark', label: 'Dark' },
          { value: 'system', label: 'System' }
        ], settings.theme))}

        ${settingRow('Animation speed', radioGroup('animationSpeed', [
          { value: 'off', label: 'Off' },
          { value: 'slow', label: 'Slow' },
          { value: 'normal', label: 'Normal' },
          { value: 'fast', label: 'Fast' }
        ], settings.animationSpeed))}

        ${settingRow('Colorblind-safe palette', toggleSwitch(settings.colorblindPalette))}

        ${sectionHeading('Behavior')}

        ${settingRow('Decimal precision', radioGroup('decimalPrecision', [
          { value: '0', label: '0' },
          { value: '1', label: '1' },
          { value: '2', label: '2' }
        ], String(settings.decimalPrecision)))}

        ${settingRow('Default landing module', radioGroup('defaultLanding', [
          { value: 'home', label: 'Home' },
          { value: 'visualize', label: 'Visualize' },
          { value: 'compare', label: 'Compare' }
        ], settings.defaultLanding))}

        ${settingRow('Auto-run on input change', toggleSwitch(settings.autoRun))}

        ${isLoggedIn() ? `
          ${sectionHeading('Account')}
          <div style="padding:8px 0">
            <div style="font-size:14px;color:var(--text-primary);margin-bottom:12px">Signed in as <strong>${getUsername()}</strong></div>

            <div id="pw-change-section" style="margin-bottom:16px">
              <button class="btn btn-sm btn-ghost" id="pw-change-toggle">Change password</button>
              <div id="pw-change-form" style="display:none;margin-top:10px">
                <div class="form-group">
                  <label for="pw-old" style="font-size:13px">Current password</label>
                  <input type="password" id="pw-old" class="input" placeholder="Current password" autocomplete="current-password">
                </div>
                <div class="form-group">
                  <label for="pw-new" style="font-size:13px">New password</label>
                  <input type="password" id="pw-new" class="input" placeholder="Minimum 6 characters" autocomplete="new-password">
                </div>
                <div id="pw-change-error" style="color:var(--error, #f44336);font-size:13px;margin:6px 0;display:none"></div>
                <div id="pw-change-success" style="color:var(--success, #4caf50);font-size:13px;margin:6px 0;display:none"></div>
                <div style="display:flex;gap:8px;margin-top:8px">
                  <button class="btn btn-sm btn-primary" id="pw-change-submit">Update</button>
                  <button class="btn btn-sm btn-ghost" id="pw-change-cancel">Cancel</button>
                </div>
              </div>
            </div>

            <button class="btn btn-sm btn-ghost" id="settings-logout-all" style="color:var(--error, #f44336)">Log out of all devices</button>
          </div>
        ` : ''}

        <div style="margin-top:20px;padding-top:16px;border-top:1px solid var(--border-color);display:flex;justify-content:flex-end">
          <button class="btn btn-sm btn-ghost" id="settings-reset">Reset to defaults</button>
        </div>
      </div>
    </div>
  `;

  document.body.appendChild(overlay);
  currentOverlay = overlay;

  requestAnimationFrame(() => overlay.classList.add('active'));

  overlay.addEventListener('click', (e) => {
    if (e.target === overlay) closeSettingsModal();
  });
  overlay.querySelector('.settings-close-btn').addEventListener('click', closeSettingsModal);

  escHandler = (e) => {
    if (e.key === 'Escape') {
      closeSettingsModal();
    }
  };
  document.addEventListener('keydown', escHandler);

  overlay.querySelectorAll('input[name="theme"]').forEach(radio => {
    radio.addEventListener('change', () => {
      updateSettings({ theme: radio.value });
      applyThemeFromSettings(radio.value);
    });
  });

  overlay.querySelectorAll('input[name="animationSpeed"]').forEach(radio => {
    radio.addEventListener('change', () => {
      updateSettings({ animationSpeed: radio.value });
    });
  });

  const cbToggle = overlay.querySelectorAll('.toggle input[type="checkbox"]')[0];
  if (cbToggle) {
    cbToggle.addEventListener('change', () => {
      updateSettings({ colorblindPalette: cbToggle.checked });
      applyColorblindPalette(cbToggle.checked);
    });
  }

  overlay.querySelectorAll('input[name="decimalPrecision"]').forEach(radio => {
    radio.addEventListener('change', () => {
      updateSettings({ decimalPrecision: parseInt(radio.value, 10) });
    });
  });

  overlay.querySelectorAll('input[name="defaultLanding"]').forEach(radio => {
    radio.addEventListener('change', () => {
      updateSettings({ defaultLanding: radio.value });
    });
  });

  const autoRunToggle = overlay.querySelectorAll('.toggle input[type="checkbox"]')[1];
  if (autoRunToggle) {
    autoRunToggle.addEventListener('change', () => {
      updateSettings({ autoRun: autoRunToggle.checked });
    });
  }

  if (isLoggedIn()) {
    const pwToggleBtn = overlay.querySelector('#pw-change-toggle');
    const pwForm = overlay.querySelector('#pw-change-form');
    const pwCancel = overlay.querySelector('#pw-change-cancel');
    const pwSubmit = overlay.querySelector('#pw-change-submit');
    const pwError = overlay.querySelector('#pw-change-error');
    const pwSuccess = overlay.querySelector('#pw-change-success');
    const pwOld = overlay.querySelector('#pw-old');
    const pwNew = overlay.querySelector('#pw-new');
    const logoutAllBtn = overlay.querySelector('#settings-logout-all');

    if (pwToggleBtn && pwForm) {
      pwToggleBtn.addEventListener('click', () => {
        const visible = pwForm.style.display !== 'none';
        pwForm.style.display = visible ? 'none' : 'block';
        pwToggleBtn.textContent = visible ? 'Change password' : 'Cancel';
        pwError.style.display = 'none';
        pwSuccess.style.display = 'none';
      });
    }

    if (pwCancel) {
      pwCancel.addEventListener('click', () => {
        pwForm.style.display = 'none';
        pwToggleBtn.textContent = 'Change password';
        pwOld.value = '';
        pwNew.value = '';
        pwError.style.display = 'none';
        pwSuccess.style.display = 'none';
      });
    }

    if (pwSubmit) {
      pwSubmit.addEventListener('click', async () => {
        pwError.style.display = 'none';
        pwSuccess.style.display = 'none';

        const oldPw = pwOld.value;
        const newPw = pwNew.value;

        if (!oldPw) {
          pwError.textContent = 'Current password is required.';
          pwError.style.display = 'block';
          return;
        }
        if (newPw.length < 6) {
          pwError.textContent = 'New password must be at least 6 characters.';
          pwError.style.display = 'block';
          return;
        }
        if (newPw === oldPw) {
          pwError.textContent = 'New password must differ from current.';
          pwError.style.display = 'block';
          return;
        }

        pwSubmit.disabled = true;
        pwSubmit.textContent = 'Updating…';

        const { data, error } = await apiFetch('PATCH', '/api/auth/password', {
          oldPassword: oldPw,
          newPassword: newPw,
        });

        pwSubmit.disabled = false;
        pwSubmit.textContent = 'Update';

        if (error) {
          pwError.textContent = error;
          pwError.style.display = 'block';
          return;
        }

        pwSuccess.textContent = 'Password updated.';
        pwSuccess.style.display = 'block';
        pwOld.value = '';
        pwNew.value = '';
      });
    }

    if (logoutAllBtn) {
      logoutAllBtn.addEventListener('click', async () => {
        if (!confirm('Log out of all devices? This will end your session everywhere.')) return;

        logoutAllBtn.disabled = true;
        logoutAllBtn.textContent = 'Logging out…';

        await apiFetch('POST', '/api/auth/logout-all');

        clearAuth();
        window.location.reload();
      });
    }
  }

  const resetBtn = overlay.querySelector('#settings-reset');
  if (resetBtn) {
    resetBtn.addEventListener('click', () => {
      resetSettings();
      closeSettingsModal();
      showSettingsModal();
      const fresh = getSettings();
      applyThemeFromSettings(fresh.theme);
      applyColorblindPalette(fresh.colorblindPalette);
    });
  }
}

/**
 * Close and remove the settings modal.
 */
export function closeSettingsModal() {
  if (currentOverlay) {
    currentOverlay.classList.remove('active');
    const ref = currentOverlay;
    setTimeout(() => ref.remove(), 200);
    currentOverlay = null;
  }
  if (escHandler) {
    document.removeEventListener('keydown', escHandler);
    escHandler = null;
  }
}
