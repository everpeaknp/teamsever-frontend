import { describe, expect, it } from 'vitest';
import { isAllowedWebUrl, isSameOriginNavigation, isSafeExternalUrl } from './security';

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
});
