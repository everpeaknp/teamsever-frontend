import packageJson from '../package.json' with { type: 'json' };

const releaseTag = process.env.GITHUB_REF_NAME;
const expectedTag = `v${packageJson.version}`;

if (releaseTag !== expectedTag) {
  console.error(`Release tag ${releaseTag || '(missing)'} does not match desktop version ${expectedTag}.`);
  process.exit(1);
}
