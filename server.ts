import express from 'express';
import { createServer as createViteServer } from 'vite';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const app = express();
const PORT = process.env.PORT ? parseInt(process.env.PORT, 10) : 3000;

app.use(express.json({ limit: '10mb' }));

// HTML entities decoder
function decodeHtmlEntities(str: string): string {
  if (!str) return '';
  return str
    .replace(/&#(\d+);/g, (_, dec) => {
      try {
        return String.fromCodePoint(parseInt(dec, 10));
      } catch {
        return '';
      }
    })
    .replace(/&#x([0-9a-fA-F]+);/g, (_, hex) => {
      try {
        return String.fromCodePoint(parseInt(hex, 16));
      } catch {
        return '';
      }
    })
    .replace(/&amp;/g, '&')
    .replace(/&lt;/g, '<')
    .replace(/&gt;/g, '>')
    .replace(/&quot;/g, '"')
    .replace(/&#039;/g, "'")
    .replace(/&apos;/g, "'")
    .trim();
}

// Extract invite code and normalize WhatsApp link
export interface ParsedLinkInfo {
  originalUrl: string;
  normalizedUrl: string;
  inviteCode: string | null;
  linkType: 'GROUP' | 'CHANNEL' | 'DIRECT' | 'UNKNOWN';
  isValidFormat: boolean;
}

export function parseWhatsAppLink(rawInput: string): ParsedLinkInfo {
  const trimmed = rawInput.trim();
  if (!trimmed) {
    return {
      originalUrl: trimmed,
      normalizedUrl: '',
      inviteCode: null,
      linkType: 'UNKNOWN',
      isValidFormat: false,
    };
  }

  // Check for WhatsApp Channel
  if (trimmed.includes('whatsapp.com/channel/')) {
    return {
      originalUrl: trimmed,
      normalizedUrl: trimmed.startsWith('http') ? trimmed : `https://${trimmed}`,
      inviteCode: null,
      linkType: 'CHANNEL',
      isValidFormat: false,
    };
  }

  // Check for Direct wa.me link
  if (trimmed.includes('wa.me/') || trimmed.includes('api.whatsapp.com/send')) {
    return {
      originalUrl: trimmed,
      normalizedUrl: trimmed.startsWith('http') ? trimmed : `https://${trimmed}`,
      inviteCode: null,
      linkType: 'DIRECT',
      isValidFormat: false,
    };
  }

  // Standard group invite: chat.whatsapp.com/(invite/)?<code>
  const groupMatch = trimmed.match(/(?:https?:\/\/)?chat\.whatsapp\.com\/(?:invite\/)?([a-zA-Z0-9_-]+)/i);
  if (groupMatch && groupMatch[1]) {
    const inviteCode = groupMatch[1];
    // Invite codes are typically 20-24 characters
    const isValidCodeLength = inviteCode.length >= 18 && inviteCode.length <= 32;
    return {
      originalUrl: trimmed,
      normalizedUrl: `https://chat.whatsapp.com/${inviteCode}`,
      inviteCode,
      linkType: 'GROUP',
      isValidFormat: isValidCodeLength,
    };
  }

  return {
    originalUrl: trimmed,
    normalizedUrl: trimmed,
    inviteCode: null,
    linkType: 'UNKNOWN',
    isValidFormat: false,
  };
}

export interface CheckResult {
  id: string;
  url: string;
  inviteCode: string;
  status: 'ACTIVE' | 'REVOKED' | 'INVALID_FORMAT' | 'CHANNEL' | 'DIRECT' | 'RATE_LIMITED' | 'ERROR';
  statusText: string;
  title: string | null;
  description: string | null;
  image: string | null;
  statusCode: number;
  latencyMs: number;
  checkedAt: string;
}

// Function to check a single invite link
export async function verifyGroupLink(rawUrl: string): Promise<CheckResult> {
  const startTime = Date.now();
  const parsed = parseWhatsAppLink(rawUrl);
  const checkedAt = new Date().toISOString();
  const id = `chk_${Date.now()}_${Math.random().toString(36).substring(2, 8)}`;

  if (parsed.linkType === 'CHANNEL') {
    return {
      id,
      url: parsed.normalizedUrl || rawUrl,
      inviteCode: '',
      status: 'CHANNEL',
      statusText: 'WhatsApp Channel link (not a group invite)',
      title: null,
      description: null,
      image: null,
      statusCode: 400,
      latencyMs: Date.now() - startTime,
      checkedAt,
    };
  }

  if (parsed.linkType === 'DIRECT') {
    return {
      id,
      url: parsed.normalizedUrl || rawUrl,
      inviteCode: '',
      status: 'DIRECT',
      statusText: 'WhatsApp Direct Chat link (not a group invite)',
      title: null,
      description: null,
      image: null,
      statusCode: 400,
      latencyMs: Date.now() - startTime,
      checkedAt,
    };
  }

  if (!parsed.inviteCode || !parsed.isValidFormat) {
    return {
      id,
      url: rawUrl,
      inviteCode: parsed.inviteCode || '',
      status: 'INVALID_FORMAT',
      statusText: 'Malformed or invalid WhatsApp group invite code',
      title: null,
      description: null,
      image: null,
      statusCode: 400,
      latencyMs: Date.now() - startTime,
      checkedAt,
    };
  }

  try {
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 8000);

    const response = await fetch(parsed.normalizedUrl, {
      signal: controller.signal,
      headers: {
        'User-Agent':
          'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0.0.0 Safari/537.36',
        Accept: 'text/html,application/xhtml+xml,application/xml;q=0.9,image/avif,image/webp,*/*;q=0.8',
        'Accept-Language': 'en-US,en;q=0.9',
        'Cache-Control': 'no-cache',
      },
    });

    clearTimeout(timeoutId);
    const latencyMs = Date.now() - startTime;
    const statusCode = response.status;

    if (statusCode === 429) {
      return {
        id,
        url: parsed.normalizedUrl,
        inviteCode: parsed.inviteCode,
        status: 'RATE_LIMITED',
        statusText: 'WhatsApp Rate Limited (Too many requests)',
        title: null,
        description: null,
        image: null,
        statusCode,
        latencyMs,
        checkedAt,
      };
    }

    if (statusCode === 404 || statusCode === 410) {
      return {
        id,
        url: parsed.normalizedUrl,
        inviteCode: parsed.inviteCode,
        status: 'REVOKED',
        statusText: 'Group invite code not found or deleted (HTTP 404)',
        title: null,
        description: null,
        image: null,
        statusCode,
        latencyMs,
        checkedAt,
      };
    }

    const html = await response.text();

    // Check OpenGraph properties
    const ogTitleMatch = html.match(/<meta\s+property=["']og:title["']\s+content=["']([^"']*)["']/i);
    const rawOgTitle = ogTitleMatch ? ogTitleMatch[1] : '';
    const decodedTitle = decodeHtmlEntities(rawOgTitle);

    const ogDescMatch = html.match(/<meta\s+property=["']og:description["']\s+content=["']([^"']*)["']/i);
    const rawOgDesc = ogDescMatch ? ogDescMatch[1] : '';
    const decodedDesc = decodeHtmlEntities(rawOgDesc);

    const ogImageMatch = html.match(/<meta\s+property=["']og:image["']\s+content=["']([^"']*)["']/i);
    const ogImage = ogImageMatch ? decodeHtmlEntities(ogImageMatch[1]) : null;

    // Check invite_link_type_v2
    const linkTypeV2Match = html.match(/<meta\s+property=["']invite_link_type_v2["']\s+content=["']([^"']*)["']/i);
    const linkTypeV2 = linkTypeV2Match ? linkTypeV2Match[1] : '';

    // Error strings in WhatsApp HTML indicating revoked/reset/invalid
    const isResetText =
      html.includes("You can't join this group because this invite link was reset") ||
      html.includes("Couldn't find this WhatsApp group") ||
      html.includes('link was reset') ||
      html.includes('link was revoked') ||
      html.includes('Check the link and try again');

    // When og:title is populated, WhatsApp returns the real group title
    // When revoked or invalid code, og:title is empty ("") and og:image is default placeholder
    const isDefaultFallbackImage =
      !ogImage ||
      ogImage.includes('rukeqTVNJDY.png') ||
      ogImage.includes('static.whatsapp.net/rsrc.php');

    const hasValidTitle = Boolean(decodedTitle && decodedTitle.trim().length > 0);

    if (hasValidTitle && !isResetText) {
      return {
        id,
        url: parsed.normalizedUrl,
        inviteCode: parsed.inviteCode,
        status: 'ACTIVE',
        statusText: 'Active WhatsApp Group Invite',
        title: decodedTitle,
        description: decodedDesc || 'WhatsApp Group Invite',
        image: isDefaultFallbackImage ? null : ogImage,
        statusCode,
        latencyMs,
        checkedAt,
      };
    } else {
      return {
        id,
        url: parsed.normalizedUrl,
        inviteCode: parsed.inviteCode,
        status: 'REVOKED',
        statusText: isResetText
          ? 'Invite link was reset or revoked by admin'
          : 'Dead or expired invite link (No group metadata)',
        title: null,
        description: null,
        image: null,
        statusCode,
        latencyMs,
        checkedAt,
      };
    }
  } catch (err: unknown) {
    const latencyMs = Date.now() - startTime;
    const isAbort = err instanceof Error && err.name === 'AbortError';
    return {
      id,
      url: parsed.normalizedUrl,
      inviteCode: parsed.inviteCode,
      status: 'ERROR',
      statusText: isAbort ? 'Request timed out after 8s' : 'Network/Connection Error',
      title: null,
      description: null,
      image: null,
      statusCode: 504,
      latencyMs,
      checkedAt,
    };
  }
}

// Sample dataset
const SAMPLE_LINKS = [
  {
    url: 'https://chat.whatsapp.com/GlQfvc83mSH3F6ov06vuCt',
    expected: 'Active Community Group (Programmers)',
  },
  {
    url: 'https://chat.whatsapp.com/BtbXYGSqn79J2MMMHg333',
    expected: 'Revoked / Reset Invite Link',
  },
  {
    url: 'https://chat.whatsapp.com/H41k9qCj6212h1x8G76h99',
    expected: 'Dead / Non-existent Invite Link',
  },
  {
    url: 'https://chat.whatsapp.com/invite/nonexistent1234567890',
    expected: 'Expired Invite Link',
  },
  {
    url: 'https://whatsapp.com/channel/0029Va4K8740rGoDqN2v1w2L',
    expected: 'WhatsApp Channel Link',
  },
  {
    url: 'https://chat.whatsapp.com/INVALID_SHORT',
    expected: 'Malformed Short Code',
  },
];

// Routes

// 1. Single check
app.post('/api/check-single', async (req, res) => {
  const { url } = req.body;
  if (!url || typeof url !== 'string') {
    res.status(400).json({ error: 'Valid "url" string is required' });
    return;
  }
  const result = await verifyGroupLink(url);
  res.json({ success: true, result });
});

// 2. Batch check with progress/delay control
app.post('/api/check-batch', async (req, res) => {
  const { links, delayMs = 100, concurrency = 3 } = req.body;

  if (!Array.isArray(links)) {
    res.status(400).json({ error: '"links" must be an array of strings' });
    return;
  }

  const cleanLinks = links
    .map((l: unknown) => (typeof l === 'string' ? l.trim() : ''))
    .filter((l: string) => l.length > 0);

  if (cleanLinks.length === 0) {
    res.json({ success: true, results: [], stats: { total: 0, active: 0, revoked: 0, invalid: 0, errors: 0 } });
    return;
  }

  // Safe concurrency limit
  const maxConcurrency = Math.min(Math.max(1, concurrency), 10);
  const throttleMs = Math.min(Math.max(0, delayMs), 3000);

  const results: CheckResult[] = [];
  let currentIndex = 0;

  async function worker() {
    while (currentIndex < cleanLinks.length) {
      const index = currentIndex++;
      const targetUrl = cleanLinks[index];
      const checkRes = await verifyGroupLink(targetUrl);
      results.push(checkRes);

      if (throttleMs > 0 && currentIndex < cleanLinks.length) {
        await new Promise((resolve) => setTimeout(resolve, throttleMs));
      }
    }
  }

  const workers = Array.from({ length: Math.min(maxConcurrency, cleanLinks.length) }, () => worker());
  await Promise.all(workers);

  const stats = {
    total: results.length,
    active: results.filter((r) => r.status === 'ACTIVE').length,
    revoked: results.filter((r) => r.status === 'REVOKED').length,
    invalid: results.filter((r) => r.status === 'INVALID_FORMAT' || r.status === 'CHANNEL' || r.status === 'DIRECT').length,
    errors: results.filter((r) => r.status === 'ERROR' || r.status === 'RATE_LIMITED').length,
  };

  res.json({ success: true, results, stats });
});

// 3. Extract WhatsApp links from raw multi-line or paragraph text
app.post('/api/extract-links', (req, res) => {
  const { text } = req.body;
  if (!text || typeof text !== 'string') {
    res.json({ count: 0, links: [] });
    return;
  }

  const linkRegex = /(?:https?:\/\/)?chat\.whatsapp\.com\/(?:invite\/)?[a-zA-Z0-9_-]+/gi;
  const matches = text.match(linkRegex) || [];

  // Normalize and deduplicate
  const unique = Array.from(
    new Set(
      matches.map((m) => {
        const clean = m.trim();
        return clean.startsWith('http') ? clean : `https://${clean}`;
      })
    )
  );

  res.json({ count: unique.length, links: unique });
});

// 4. Sample links endpoint
app.get('/api/sample-groups', (_req, res) => {
  res.json({ success: true, samples: SAMPLE_LINKS });
});

// Setup Vite middleware in dev or static files in production
async function startServer() {
  if (process.env.NODE_ENV === 'production') {
    app.use(express.static(path.resolve(__dirname, 'dist')));
    app.get('*', (_req, res) => {
      res.sendFile(path.resolve(__dirname, 'dist', 'index.html'));
    });
  } else {
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: 'spa',
    });
    app.use(vite.middlewares);
  }

  app.listen(PORT, '0.0.0.0', () => {
    console.log(`WhatsApp Link Checker Server running at http://0.0.0.0:${PORT}`);
  });
}

startServer();
