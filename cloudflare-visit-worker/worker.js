export default {
  async fetch(request, env) {
    const url = new URL(request.url);

    if (request.method === 'OPTIONS') {
      return new Response(null, {
        headers: corsHeaders(),
      });
    }

    if (request.method === 'GET' && (url.pathname === '/' || url.pathname === '/api/visits')) {
      const visits = await readVisits(env);
      return jsonResponse({ visits });
    }

    if ((request.method === 'GET' || request.method === 'POST') && url.pathname === '/api/visit') {
      const visits = await countVisit(request, env);
      return jsonResponse({ visits });
    }

    return jsonResponse({ error: 'Not Found' }, 404);
  },
};

const COUNTER_KEY = 'visits';
const VISITOR_TTL_SECONDS = 60 * 60 * 36;

async function countVisit(request, env) {
  const visits = await readVisits(env);
  const today = new Date().toISOString().slice(0, 10);
  const ip = request.headers.get('CF-Connecting-IP') ||
    request.headers.get('X-Forwarded-For') ||
    'unknown-ip';
  const ua = request.headers.get('User-Agent') || 'unknown-ua';
  const visitorHash = await sha256Hex(`${today}|${ip}|${ua}`);
  const visitorKey = `visitor:${today}:${visitorHash}`;

  const seen = await env.VISIT_COUNTS.get(visitorKey);
  if (seen) return visits;

  const nextVisits = visits + 1;
  await Promise.all([
    env.VISIT_COUNTS.put(COUNTER_KEY, String(nextVisits)),
    env.VISIT_COUNTS.put(visitorKey, '1', { expirationTtl: VISITOR_TTL_SECONDS }),
  ]);

  return nextVisits;
}

async function readVisits(env) {
  const raw = await env.VISIT_COUNTS.get(COUNTER_KEY);
  const visits = Number(raw);
  if (!Number.isFinite(visits)) return 0;
  return Math.max(0, Math.floor(visits));
}

async function sha256Hex(value) {
  const bytes = new TextEncoder().encode(value);
  const digest = await crypto.subtle.digest('SHA-256', bytes);
  return Array.from(new Uint8Array(digest))
    .map((byte) => byte.toString(16).padStart(2, '0'))
    .join('');
}

function jsonResponse(data, status = 200) {
  return new Response(JSON.stringify(data), {
    status,
    headers: {
      'Content-Type': 'application/json',
      ...corsHeaders(),
    },
  });
}

function corsHeaders() {
  return {
    'Access-Control-Allow-Origin': '*',
    'Access-Control-Allow-Methods': 'GET, POST, OPTIONS',
    'Access-Control-Allow-Headers': 'Content-Type',
  };
}
