'use client';
// Main page — wraps ExcelApp in Suspense (required for useSearchParams in Next.js 14)

import { Suspense } from 'react';
import { ExcelApp } from '@/components/ExcelApp';

export default function Page() {
  return (
    <Suspense fallback={<div className="flex h-screen items-center justify-center text-sm text-gray-500">Loading...</div>}>
      <ExcelApp />
    </Suspense>
  );
}
