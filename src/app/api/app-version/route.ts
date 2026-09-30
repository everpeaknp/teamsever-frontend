export const dynamic = 'force-dynamic';
export const revalidate = 0;

export async function GET() {
  const version =
    process.env.VERCEL_GIT_COMMIT_SHA ||
    process.env.GITHUB_SHA ||
    process.env.NEXT_PUBLIC_APP_BUILD_ID ||
    'development';

  return Response.json(
    { version },
    { headers: { 'Cache-Control': 'no-store, no-cache, must-revalidate' } },
  );
}
