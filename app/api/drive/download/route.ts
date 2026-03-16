import { NextRequest, NextResponse } from 'next/server';
import { google } from 'googleapis';

function oauthClient(accessToken: string, refreshToken: string) {
  const client = new google.auth.OAuth2(
    process.env.GOOGLE_CLIENT_ID,
    process.env.GOOGLE_CLIENT_SECRET,
    process.env.GOOGLE_REDIRECT_URI ?? 'http://localhost:3000/api/drive/callback'
  );
  client.setCredentials({ access_token: accessToken, refresh_token: refreshToken });
  return client;
}

// POST /api/drive/download — scarica file xlsx da Drive
export async function POST(req: NextRequest) {
  try {
    const { fileId, accessToken, refreshToken } = await req.json();
    if (!fileId || !accessToken) return NextResponse.json({ error: 'Parametri mancanti' }, { status: 400 });

    const auth  = oauthClient(accessToken, refreshToken);
    const drive = google.drive({ version: 'v3', auth });

    const res = await drive.files.get(
      { fileId, alt: 'media' },
      { responseType: 'arraybuffer' }
    );

    return new NextResponse(res.data as ArrayBuffer, {
      headers: { 'Content-Type': 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet' },
    });
  } catch (err) {
    console.error('Drive download error:', err);
    return NextResponse.json({ error: err instanceof Error ? err.message : 'Errore download' }, { status: 500 });
  }
}
