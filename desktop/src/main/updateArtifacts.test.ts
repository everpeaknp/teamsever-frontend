import { describe, expect, it } from 'vitest';
import { resolve } from 'node:path';
import { pathToFileURL } from 'node:url';
import { isDirectExecution, validateUpdateArtifacts } from '../../scripts/validate-update-artifacts.mjs';

describe('validateUpdateArtifacts', () => {
  it('detects direct script execution using platform-correct file URL paths', () => {
    const scriptPath = resolve('scripts/validate-update-artifacts.mjs');
    expect(isDirectExecution(pathToFileURL(scriptPath).href, scriptPath)).toBe(true);
    expect(isDirectExecution(pathToFileURL(scriptPath).href, resolve('src/main/updateArtifacts.test.ts'))).toBe(false);
  });

  it('accepts Windows update metadata that points to the setup executable', () => {
    expect(() => validateUpdateArtifacts('win', {
      'latest.yml': 'version: 0.1.5\npath: TeamsEver-Setup.exe\nfiles:\n  - url: TeamsEver-Setup.exe\n',
      'TeamsEver-Setup.exe': '',
    })).not.toThrow();
  });

  it('accepts Linux update metadata that points to the AppImage', () => {
    expect(() => validateUpdateArtifacts('linux', {
      'latest-linux.yml': 'version: 0.1.5\npath: TeamsEver.AppImage\nfiles:\n  - url: TeamsEver.AppImage\n',
      'TeamsEver.AppImage': '',
    })).not.toThrow();
  });

  it.each([
    ['win', { 'TeamsEver-Setup.exe': '' }],
    ['linux', { 'latest-linux.yml': 'version: 0.1.5\npath: TeamsEver.AppImage\n' }],
  ] as const)('rejects incomplete %s release assets', (platform, assets) => {
    expect(() => validateUpdateArtifacts(platform, assets)).toThrow();
  });
});
