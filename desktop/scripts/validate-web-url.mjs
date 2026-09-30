const value = process.env.TEAMSEVER_WEB_URL?.trim();

if (!value) {
  console.error('Set TEAMSEVER_WEB_URL to the deployed TeamsEver HTTPS origin before packaging.');
  process.exit(1);
}

try {
  const url = new URL(value);
  if (url.protocol !== 'https:' || url.username || url.password) {
    throw new Error('The URL must use HTTPS and must not contain credentials.');
  }
} catch (error) {
  console.error(`Invalid TEAMSEVER_WEB_URL: ${error instanceof Error ? error.message : 'invalid URL'}`);
  process.exit(1);
}
