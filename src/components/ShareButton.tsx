'use client';
// URL sharing: compress workbook → URL param or Vercel Blob → clipboard

import React, { useState } from 'react';
import { Share2, Loader2 } from 'lucide-react';
import { Button } from './ui/button';
import { useWorkbook } from '@/hooks/useWorkbook';
import { compressWorkbook } from '@/lib/share-compressor';

interface ShareButtonProps {
  onMessage: (msg: string, type: 'success' | 'error') => void;
}

export function ShareButton({ onMessage }: ShareButtonProps) {
  const { state } = useWorkbook();
  const [loading, setLoading] = useState(false);

  const handleShare = async () => {
    setLoading(true);
    try {
      const { compressed, tier } = compressWorkbook(state);

      if (tier === 'too-large') {
        onMessage('File is too large to share via URL (>100KB compressed)', 'error');
        return;
      }

      let shareUrl: string;

      if (tier === 'url') {
        const url = new URL(window.location.href);
        url.search = '';
        url.searchParams.set('data', compressed);
        shareUrl = url.toString();
      } else {
        const res = await fetch('/api/share', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ data: compressed }),
        });

        if (!res.ok) {
          sessionStorage.setItem('excel-share', compressed);
          const key = Math.random().toString(36).slice(2);
          sessionStorage.setItem('excel-share-key', key);
          const url = new URL(window.location.href);
          url.search = '';
          url.searchParams.set('id', `session:${key}`);
          shareUrl = url.toString();
        } else {
          const { id } = await res.json() as { id: string };
          const url = new URL(window.location.href);
          url.search = '';
          url.searchParams.set('id', id);
          shareUrl = url.toString();
        }
      }

      await navigator.clipboard.writeText(shareUrl);
      onMessage('Share URL copied to clipboard!', 'success');
    } catch (e) {
      onMessage(`Share failed: ${e instanceof Error ? e.message : String(e)}`, 'error');
    } finally {
      setLoading(false);
    }
  };

  return (
    <Button variant="toolbar" size="sm" onClick={handleShare} disabled={loading || state.sheets.length === 0}>
      {loading ? <Loader2 className="h-3.5 w-3.5 animate-spin mr-1" /> : <Share2 className="h-3.5 w-3.5 mr-1" />}
      Share
    </Button>
  );
}
