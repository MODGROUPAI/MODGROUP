import { NextRequest, NextResponse } from 'next/server';
import { google } from 'googleapis';
import { Readable } from 'stream';

const FOLDER_ID = process.env.GOOGLE_DRIVE_FOLDER_ID ?? '1DRn8CQPBbDV4IIt4VG0kuWPm0tfROkFW';

function oauthClient(accessToken: string, refreshToken: string) {
  const client = new google.auth.OAuth2(
    process.env.GOOGLE_CLIENT_ID,
    process.env.GOOGLE_CLIENT_SECRET,
    process.env.GOOGLE_REDIRECT_URI ?? 'http://localhost:3000/api/drive/callback'
  );
  client.setCredentials({ access_token: accessToken, refresh_token: refreshToken });
  return client;
}

export async function POST(req: NextRequest) {
  try {
    const formData    = await req.formData();
    const file        = formData.get('file') as File;
    const fileId      = formData.get('fileId') as string | null;
    const accessToken = formData.get('accessToken') as string;
    const refreshToken= formData.get('refreshToken') as string;

    if (!file || !accessToken) {
      return NextResponse.json({ error: 'Parametri mancanti' }, { status: 400 });
    }

    const auth    = oauthClient(accessToken, refreshToken);
    const drive   = google.drive({ version: 'v3', auth });
    const buffer  = Buffer.from(await file.arrayBuffer());
    const stream  = Readable.from(buffer);
    const mimeType = 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet';

    let result;
    if (fileId) {
      // Aggiorna file esistente (mantiene posizione nella cartella)
      result = await drive.files.update({
        fileId,
        media: { mimeType, body: stream },
        fields: 'id,name,modifiedTime',
      });
    } else {
      // Cerca se esiste già PMO_MOD_Tracker.xlsx nella cartella
      const existing = await drive.files.list({
        q: `name='PMO_MOD_Tracker.xlsx' and '${FOLDER_ID}' in parents and trashed=false`,
        fields: 'files(id,name)',
        pageSize: 1,
      });

      if (existing.data.files && existing.data.files.length > 0) {
        // Aggiorna quello esistente
        const existingId = existing.data.files[0].id!;
        result = await drive.files.update({
          fileId: existingId,
          media: { mimeType, body: stream },
          fields: 'id,name,modifiedTime',
        });
      } else {
        // Crea nuovo nella cartella
        result = await drive.files.create({
          requestBody: {
            name: 'PMO_MOD_Tracker.xlsx',
            mimeType,
            parents: [FOLDER_ID],
          },
          media: { mimeType, body: stream },
          fields: 'id,name,modifiedTime',
        });
      }
    }

    return NextResponse.json({
      fileId:       result.data.id,
      name:         result.data.name,
      modifiedTime: result.data.modifiedTime,
    });
  } catch (err) {
    console.error('Drive upload error:', err);
    return NextResponse.json(
      { error: err instanceof Error ? err.message : 'Errore upload' },
      { status: 500 }
    );
  }
}
