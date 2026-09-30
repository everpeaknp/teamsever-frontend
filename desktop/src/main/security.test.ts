import { describe, expect, it } from 'vitest';
import { isAllowedWebUrl, isFirebaseAuthPopupUrl, isSameOriginNavigation, isSafeExternalUrl } from './security';

describe('desktop URL security rules', () => {
  it('allows only localhost HTTP during development', () => {
    expect(isAllowedWebUrl('http://localhost:3000', false)).toBe(true);
    expect(isAllowedWebUrl('http://192.168.1.10:3000', false)).toBe(false);
    expect(isAllowedWebUrl('http://localhost:3000', true)).toBe(false);
  });

  it('requires HTTPS for configured non-local app URLs', () => {
    expect(isAllowedWebUrl('https://app.teamsever.example', true)).toBe(true);
    expect(isAllowedWebUrl('http://app.teamsever.example', false)).toBe(false);
    expect(isAllowedWebUrl('https://user:pass@app.teamsever.example', true)).toBe(false);
  });

  it('keeps navigation in the configured origin and only opens safe HTTPS links externally', () => {
    expect(isSameOriginNavigation('https://app.example/workspace', 'https://app.example')).toBe(true);
    expect(isSameOriginNavigation('https://evil.example', 'https://app.example')).toBe(false);
    expect(isSafeExternalUrl('https://docs.example')).toBe(true);
    expect(isSafeExternalUrl('javascript:alert(1)')).toBe(false);
    expect(isSafeExternalUrl('file:///etc/passwd')).toBe(false);
  });

  it('allows only the TeamsEver Firebase auth handler as an in-app popup', () => {
    expect(isFirebaseAuthPopupUrl('https://teamsever-44340.firebaseapp.com/__/auth/handler?state=abc')).toBe(true);
    expect(isFirebaseAuthPopupUrl('https://other-project.firebaseapp.com/__/auth/handler')).toBe(false);
    expect(isFirebaseAuthPopupUrl('https://teamsever-44340.firebaseapp.com/__/auth/authorize')).toBe(false);
    expect(isFirebaseAuthPopupUrl('http://teamsever-44340.firebaseapp.com/__/auth/handler')).toBe(false);
    expect(isFirebaseAuthPopupUrl('https://teamsever-44340.firebaseapp.com.evil.test/__/auth/handler')).toBe(false);
  });
});
