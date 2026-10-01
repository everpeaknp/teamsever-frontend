import { readdir, readFile } from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const platforms = {
  win: { manifest: 'latest.yml', installer: 'TeamsEver-Setup.exe' },
  linux: { manifest: 'latest-linux.yml', installer: 'TeamsEver.AppImage' },
};

export function validateUpdateArtifacts(platform, assets) {
  const expected = platforms[platform];
  if (!expected) throw new Error(`Unsupported update platform: ${platform}`);

  const manifest = assets[expected.manifest];
  if (typeof manifest !== 'string') throw new Error(`Missing ${expected.manifest}`);
  if (typeof assets[expected.installer] !== 'string') throw new Error(`Missing ${expected.installer}`);

  const namesInManifest = [...manifest.matchAll(/^\s*(?:url|path):\s*["']?([^\s"']+)/gm)].map((match) => path.basename(match[1]));
  if (!namesInManifest.includes(expected.installer)) {
    throw new Error(`${expected.manifest} does not reference ${expected.installer}`);
  }
  return true;
}

export function isDirectExecution(moduleUrl, entryPath) {
  if (!entryPath) return false;
  return path.resolve(entryPath) === path.resolve(fileURLToPath(moduleUrl));
}

async function validateDirectory(platform, directory) {
  const names = await readdir(directory);
  const assets = {};
  for (const name of names) {
    if (name === platforms[platform]?.manifest || name === platforms[platform]?.installer) {
      assets[name] = name === platforms[platform].manifest
        ? await readFile(path.join(directory, name), 'utf8')
        : '';
    }
  }
  validateUpdateArtifacts(platform, assets);
  process.stdout.write(`Validated ${platform} update metadata in ${directory}\n`);
}

if (isDirectExecution(import.meta.url, process.argv[1])) {
  const [platform, directory = 'release'] = process.argv.slice(2);
  if (!platform) throw new Error('Usage: node scripts/validate-update-artifacts.mjs <win|linux> [directory]');
  await validateDirectory(platform, directory);
}
