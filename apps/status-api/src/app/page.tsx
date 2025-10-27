'use client';

import { useEffect, useState } from 'react';

interface StatusData {
  lastRun: string;
  productsScraped: number;
  productsExported: number;
  pagesCrawled: number;
  errors: number;
  durationMs: number;
}

export default function Home() {
  const [status, setStatus] = useState<StatusData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    async function fetchStatus() {
      try {
        const res = await fetch('/api/status');
        if (!res.ok) {
          throw new Error(`HTTP ${res.status}`);
        }
        const data = await res.json();
        setStatus(data);
      } catch (err) {
        setError(String(err));
      } finally {
        setLoading(false);
      }
    }

    fetchStatus();
    const interval = setInterval(fetchStatus, 30000); // Refresh every 30s
    return () => clearInterval(interval);
  }, []);

  return (
    <div style={{ fontFamily: 'system-ui, sans-serif', padding: '20px', maxWidth: '600px', margin: '0 auto' }}>
      <h1>UnitedFabrics Scraper Status</h1>

      {loading && <p>Loading...</p>}
      {error && <p style={{ color: 'red' }}>Error: {error}</p>}

      {status && (
        <div style={{ border: '1px solid #ccc', borderRadius: '8px', padding: '16px' }}>
          <p>
            <strong>Last Run:</strong> {new Date(status.lastRun).toLocaleString()}
          </p>
          <p>
            <strong>Products Scraped:</strong> {status.productsScraped}
          </p>
          <p>
            <strong>Products Exported:</strong> {status.productsExported}
          </p>
          <p>
            <strong>Pages Crawled:</strong> {status.pagesCrawled}
          </p>
          <p>
            <strong>Errors:</strong> {status.errors}
          </p>
          <p>
            <strong>Duration:</strong> {(status.durationMs / 1000).toFixed(2)}s
          </p>
        </div>
      )}
    </div>
  );
}
