import type { Metadata } from 'next';
import type { ReactNode } from 'react';
import './globals.css';
import { WorkbookProvider } from '@/context/WorkbookContext';
import { SelectionProvider } from '@/context/SelectionContext';

export const metadata: Metadata = {
  title: 'Excel App — Browser-based Spreadsheet Editor',
  description: 'Open, edit, and share Excel files directly in your browser. Supports xlsx, xls, xlsm, csv.',
};

export default function RootLayout({ children }: { children: ReactNode }) {
  return (
    <html lang="en">
      <body>
        <WorkbookProvider>
          <SelectionProvider>
            {children}
          </SelectionProvider>
        </WorkbookProvider>
      </body>
    </html>
  );
}
