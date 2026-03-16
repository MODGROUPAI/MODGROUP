import { NextRequest, NextResponse } from 'next/server';
import { google } from 'googleapis';

function oauthClient() {
  return new google.auth.OAuth2(
    process.env.GOOGLE_CLIENT_ID,
    process.env.GOOGLE_CLIENT_SECRET,
    process.env.GOOGLE_REDIRECT_URI ?? 'http://localhost:3000/api/drive/callback'
  );
}

export async function GET(req: NextRequest) {
  const code = req.nextUrl.searchParams.get('code');
  if (!code) return NextResponse.redirect('/?drive_error=no_code');

  try {
    const client = oauthClient();
    const { tokens } = await client.getToken(code);
    // Passa il token alla pagina via query param (poi salvato in localStorage)
    const tokenEncoded = encodeURIComponent(JSON.stringify(tokens));
    return NextResponse.redirect(`/?drive_token=${tokenEncoded}`);
  } catch (err) {
    console.error('OAuth callback error:', err);
    return NextResponse.redirect('/?drive_error=auth_failed');
  }
}
