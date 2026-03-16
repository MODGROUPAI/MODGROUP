import { NextRequest, NextResponse } from 'next/server';

function extractDriveId(url: string): string | null {
  const patterns = [
    /\/file\/d\/([a-zA-Z0-9_-]+)/,
    /id=([a-zA-Z0-9_-]+)/,
    /\/d\/([a-zA-Z0-9_-]+)/,
    /^([a-zA-Z0-9_-]{25,})$/,
  ];
  for (const p of patterns) {
    const m = url.trim().match(p);
    if (m) return m[1];
  }
  return null;
}

export async function POST(req: NextRequest) {
  try {
    const { url } = await req.json();
    if (!url) return NextResponse.json({ error: 'URL mancante' }, { status: 400 });

    const fileId = extractDriveId(url);
    if (!fileId) return NextResponse.json({ error: 'URL Google Drive non riconosciuto' }, { status: 400 });

    const downloadUrl = `https://drive.google.com/uc?export=download&id=${fileId}&confirm=t`;

    const res = await fetch(downloadUrl, {
      headers: { 'User-Agent': 'Mozilla/5.0' },
      redirect: 'follow',
    });

    if (!res.ok) {
      return NextResponse.json(
        { error: `Impossibile scaricare (${res.status}). Verifica che il link sia pubblico.` },
        { status: 400 }
      );
    }

    const contentType = res.headers.get('content-type') ?? '';
    if (contentType.includes('text/html')) {
      return NextResponse.json(
        { error: 'File troppo grande per il download diretto. Usa "Importa file" dal computer.' },
        { status: 400 }
      );
    }

    const buffer = await res.arrayBuffer();
    return new NextResponse(buffer, {
      headers: { 'Content-Type': 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet' },
    });
  } catch (err) {
    return NextResponse.json(
      { error: err instanceof Error ? err.message : 'Errore sconosciuto' },
      { status: 500 }
    );
  }
}
