// API route for sharing large workbooks via Vercel Blob (fallback to sessionStorage key)

import { NextRequest, NextResponse } from 'next/server';

const BLOB_TOKEN = process.env.BLOB_READ_WRITE_TOKEN;

export async function POST(req: NextRequest) {
  try {
    const { data } = await req.json() as { data: string };
    if (!data || typeof data !== 'string') {
      return NextResponse.json({ error: 'Invalid data' }, { status: 400 });
    }

    if (!BLOB_TOKEN) {
      const id = `local_${Date.now()}_${Math.random().toString(36).slice(2, 7)}`;
      return NextResponse.json({ id, message: 'No Blob storage configured — use URL param sharing' }, { status: 200 });
    }

    const { put } = await import('@vercel/blob');
    const blob = await put(`excel-share/${Date.now()}.lzs`, data, {
      access: 'public',
      token: BLOB_TOKEN,
      contentType: 'text/plain',
    });

    const id = blob.url.split('/').pop()?.replace('.lzs', '') ?? '';
    return NextResponse.json({ id, url: blob.url });
  } catch (e) {
    return NextResponse.json({ error: e instanceof Error ? e.message : 'Unknown error' }, { status: 500 });
  }
}

export async function GET(req: NextRequest) {
  try {
    const id = req.nextUrl.searchParams.get('id');
    if (!id) return NextResponse.json({ error: 'Missing id' }, { status: 400 });

    if (!BLOB_TOKEN) {
      return NextResponse.json({ error: 'Blob storage not configured' }, { status: 503 });
    }

    const { list } = await import('@vercel/blob');
    const { blobs } = await list({ prefix: 'excel-share/', token: BLOB_TOKEN });
    const blob = blobs.find((b) => b.pathname.includes(id));
    if (!blob) return NextResponse.json({ error: 'Not found' }, { status: 404 });

    const res = await fetch(blob.url);
    const text = await res.text();
    return new NextResponse(text, { headers: { 'Content-Type': 'text/plain' } });
  } catch (e) {
    return NextResponse.json({ error: e instanceof Error ? e.message : 'Unknown error' }, { status: 500 });
  }
}
