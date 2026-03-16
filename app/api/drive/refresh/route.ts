import { NextRequest, NextResponse } from 'next/server';
import { google } from 'googleapis';

export async function POST(req: NextRequest) {
  try {
    const { refreshToken } = await req.json();
    if (!refreshToken) return NextResponse.json({ error: 'refreshToken mancante' }, { status: 400 });

    const client = new google.auth.OAuth2(
      process.env.GOOGLE_CLIENT_ID,
      process.env.GOOGLE_CLIENT_SECRET,
      process.env.GOOGLE_REDIRECT_URI ?? 'http://localhost:3000/api/drive/callback'
    );
    client.setCredentials({ refresh_token: refreshToken });
    const { credentials } = await client.refreshAccessToken();

    return NextResponse.json({
      access_token:  credentials.access_token,
      expiry_date:   credentials.expiry_date,
      refresh_token: credentials.refresh_token ?? refreshToken,
    });
  } catch (err) {
    return NextResponse.json({ error: err instanceof Error ? err.message : 'Refresh fallito' }, { status: 500 });
  }
}
