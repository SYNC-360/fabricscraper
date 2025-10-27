import type { Metadata } from 'next';

export const metadata: Metadata = {
  title: 'UnitedFabrics Scraper Status',
  description: 'Real-time status of the UnitedFabrics scraper',
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en">
      <body>{children}</body>
    </html>
  );
}
