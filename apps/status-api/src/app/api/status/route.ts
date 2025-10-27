import { promises as fs } from 'fs';
import path from 'path';

interface LastRunJSON {
  timestamp: string;
  productsScraped: number;
  productsExported: number;
  pagesCrawled: number;
  errors: number;
  errorDetails?: Array<{ url: string; error: string }>;
}

export async function GET() {
  try {
    // Try to read from local file (for local development)
    const outputPath = path.join(process.cwd(), '..', '..', '..', 'output', 'last-run.json');

    let lastRun: LastRunJSON;
    try {
      const data = await fs.readFile(outputPath, 'utf-8');
      lastRun = JSON.parse(data);
    } catch (err) {
      // File not found or invalid; return empty status
      lastRun = {
        timestamp: new Date().toISOString(),
        productsScraped: 0,
        productsExported: 0,
        pagesCrawled: 0,
        errors: 0,
      };
    }

    return Response.json({
      lastRun: lastRun.timestamp,
      productsScraped: lastRun.productsScraped,
      productsExported: lastRun.productsExported,
      pagesCrawled: lastRun.pagesCrawled,
      errors: lastRun.errors,
      durationMs: 0, // Could be calculated if timestamps are available
    });
  } catch (err) {
    return Response.json(
      { error: String(err) },
      { status: 500 }
    );
  }
}
