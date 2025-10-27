import dotenv from 'dotenv';

dotenv.config();

export const config = {
  // URLs
  baseUrl: process.env.UF_BASE_URL || 'https://www.unitedfabrics.com',
  loginUrl: process.env.UF_LOGIN_URL || 'https://www.unitedfabrics.com/my-account/',
  startListing: process.env.UF_START_LISTING || 'https://www.unitedfabrics.com/fabric/',

  // Credentials
  email: process.env.UF_EMAIL || '',
  password: process.env.UF_PASSWORD || '',

  // Apify
  apifyToken: process.env.APIFY_TOKEN || '',

  // Proxy
  proxyUrl: process.env.PROXY_URL || '',

  // Limits
  maxPages: Number(process.env.MAX_PAGES || 0),
  concurrency: Number(process.env.CONCURRENCY || 3),
  requestTimeoutMs: Number(process.env.REQUEST_TIMEOUT_MS || 45000),
  respectRobotsTxt: process.env.RESPECT_ROBOTS_TXT === 'true',

  // Behavior
  incrementalMode: process.env.INCREMENTAL_MODE !== 'false',
  brandFilter: process.env.BRAND_FILTER || '',
};
