const value = process.env.TEAMSEVER_API_URL?.trim();
if (!value) {
  console.error('Set TEAMSEVER_API_URL to the deployed TeamsEver backend HTTPS origin before packaging.');
  process.exit(1);
}
try {
  const url = new URL(value);
  if (url.protocol !== 'https:' || url.username || url.password || !['', '/'].includes(url.pathname) || url.search || url.hash) {
    throw new Error('The backend URL must be a clean HTTPS origin without credentials, path, query, or fragment.');
  }
} catch (error) {
  console.error(`Invalid TEAMSEVER_API_URL: ${error instanceof Error ? error.message : 'invalid URL'}`);
  process.exit(1);
}
