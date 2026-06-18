import { LogLevel, WorkerMailer } from 'worker-mailer';

const SERVICE_NAME = 'CV_Download';
const TOKEN_TTL_SECONDS = 300;
const REQUEST_COOLDOWN_SECONDS = 60;
const STATS_KEYS = {
  verificationSent: 'stats:verification_sent',
  downloads: 'stats:downloads'
};

export default {
  async fetch(request, env, ctx) {
    const url = new URL(request.url);

    if (request.method === 'OPTIONS') {
      return new Response(null, {
        headers: corsHeaders()
      });
    }

    if ((url.pathname === '/' || url.pathname === '/api/stats') && request.method === 'GET') {
      return handleStats(env);
    }

    if (url.pathname === '/api/request' && request.method === 'POST') {
      return handleRequest(request, env);
    }

    if (url.pathname === '/api/verify' && request.method === 'POST') {
      return handleVerify(request, env);
    }

    if (url.pathname === '/api/download' && request.method === 'POST') {
      return handleDownload(request, env, ctx);
    }

    return jsonResponse({ error: 'Not Found' }, 404);
  }
};

async function handleStats(env) {
  const [verificationSent, downloads] = await Promise.all([
    readCounter(env, STATS_KEYS.verificationSent),
    readCounter(env, STATS_KEYS.downloads)
  ]);

  return jsonResponse({
    service: SERVICE_NAME,
    verificationSent,
    downloads
  });
}

async function handleRequest(request, env) {
  try {
    validateEmailConfig(env);

    const { email, reason } = await request.json();
    const normalizedEmail = normalizeEmail(email);

    if (!normalizedEmail) {
      return jsonResponse({ success: false, message: '邮箱格式不正确' }, 400);
    }

    if (!reason || reason.trim().length < 5) {
      return jsonResponse({ success: false, message: '请填写下载原因（至少5个字符）' }, 400);
    }

    const cooldownKey = `rate:${normalizedEmail}`;
    const recentRequest = await env.CV_TOKENS.get(cooldownKey);
    if (recentRequest) {
      return jsonResponse({
        success: false,
        message: '请求过于频繁，请稍后再试'
      }, 429);
    }

    const token = generateToken();
    const timestamp = new Date().toISOString();
    const tokenData = {
      email: normalizedEmail,
      reason: reason.trim(),
      timestamp,
      downloaded: false,
      downloadTime: null
    };

    await env.CV_TOKENS.put(token, JSON.stringify(tokenData), {
      expirationTtl: TOKEN_TTL_SECONDS
    });

    try {
      await sendEmail(env, {
        to: normalizedEmail,
        subject: `[PersonalINFO] Your CV download token: ${token}`,
        html: generateVisitorEmail(token),
        text: `Your CV download token is ${token}. It expires in 5 minutes and can be used once.`
      });
    } catch (error) {
      await env.CV_TOKENS.delete(token);
      throw error;
    }

    await Promise.all([
      env.CV_TOKENS.put(cooldownKey, timestamp, { expirationTtl: REQUEST_COOLDOWN_SECONDS }),
      incrementCounter(env, STATS_KEYS.verificationSent)
    ]);

    return jsonResponse({
      success: true,
      message: '申请已提交！验证码已发送至您的邮箱，请查收（5分钟内有效，仅可下载一次）'
    });
  } catch (error) {
    console.error('处理申请失败:', error);
    return jsonResponse({
      success: false,
      message: getEmailErrorMessage(error, '发送失败，请稍后重试')
    }, getEmailErrorStatus(error));
  }
}

async function handleVerify(request, env) {
  try {
    const { token } = await request.json();
    const normalizedToken = normalizeToken(token);

    if (!normalizedToken) {
      return jsonResponse({ success: false, message: '缺少令牌' }, 400);
    }

    const data = await env.CV_TOKENS.get(normalizedToken);

    if (!data) {
      return jsonResponse({
        success: false,
        message: '令牌无效或已过期（有效期5分钟）'
      }, 401);
    }

    const tokenData = JSON.parse(data);

    return jsonResponse({
      success: true,
      email: tokenData.email,
      downloaded: tokenData.downloaded
    });
  } catch (error) {
    console.error('验证失败:', error);
    return jsonResponse({ success: false, message: '验证失败' }, 500);
  }
}

async function handleDownload(request, env, ctx) {
  try {
    validateEmailConfig(env);

    const { token } = await request.json();
    const normalizedToken = normalizeToken(token);

    if (!normalizedToken) {
      return jsonResponse({ success: false, message: '缺少令牌' }, 400);
    }

    const data = await env.CV_TOKENS.get(normalizedToken);

    if (!data) {
      return jsonResponse({ success: false, message: '令牌无效或已过期' }, 401);
    }

    const tokenData = JSON.parse(data);

    if (tokenData.downloaded) {
      return jsonResponse({ success: false, message: '此令牌已使用过' }, 401);
    }

    tokenData.downloaded = true;
    tokenData.downloadTime = new Date().toISOString();

    await Promise.all([
      env.CV_TOKENS.delete(normalizedToken),
      incrementCounter(env, STATS_KEYS.downloads)
    ]);

    const notifyAdmin = sendEmail(env, {
      to: env.ADMIN_EMAIL,
      subject: `[DownloadAlert] New CV download notification - ${tokenData.email}`,
      html: generateAdminDownloadEmail(
        tokenData.email,
        tokenData.reason,
        formatTimestamp(tokenData.timestamp),
        formatTimestamp(tokenData.downloadTime)
      ),
      text: [
        'A CV download was completed.',
        `Email: ${tokenData.email}`,
        `Reason: ${tokenData.reason}`,
        `Requested: ${formatTimestamp(tokenData.timestamp)}`,
        `Downloaded: ${formatTimestamp(tokenData.downloadTime)}`
      ].join('\n')
    }).catch(error => {
      console.error('管理员通知发送失败:', error);
    });

    if (ctx && typeof ctx.waitUntil === 'function') {
      ctx.waitUntil(notifyAdmin);
    } else {
      await notifyAdmin;
    }

    return jsonResponse({
      success: true,
      message: 'Download confirmed'
    });
  } catch (error) {
    console.error('下载处理失败:', error);
    return jsonResponse({
      success: false,
      message: getEmailErrorMessage(error, '下载失败')
    }, getEmailErrorStatus(error));
  }
}

function validateEmailConfig(env) {
  if (!env.CV_TOKENS) {
    throw createConfigError('KV 存储尚未配置');
  }

  if (!getSmtpPassword(env)) {
    throw createConfigError('SMTP 授权码尚未配置');
  }

  if (!normalizeEmail(getSmtpFromEmail(env))) {
    throw createConfigError('发件邮箱尚未配置');
  }

  if (!normalizeEmail(env.ADMIN_EMAIL)) {
    throw createConfigError('管理员邮箱尚未配置');
  }
}

function createConfigError(message) {
  const error = new Error(message);
  error.code = 'CONFIG_ERROR';
  return error;
}

async function sendEmail(env, { to, subject, html, text }) {
  const fromEmail = getSmtpFromEmail(env);
  return WorkerMailer.send(getSmtpOptions(env), {
    from: {
      name: getStringValue(env.SENDER_NAME) || SERVICE_NAME,
      email: fromEmail
    },
    to: { email: normalizeEmail(to) },
    reply: normalizeEmail(env.ADMIN_EMAIL) || undefined,
    subject,
    text,
    html
  });
}

function getSmtpOptions(env) {
  return {
    host: getStringValue(env.SMTP_HOST) || getStringValue(env.QQ_SMTP_HOST) || 'smtp.qq.com',
    port: getIntValue(env.SMTP_PORT ?? env.QQ_SMTP_PORT, 465),
    secure: getBooleanValue(env.SMTP_SECURE ?? env.QQ_SMTP_SECURE, true),
    startTls: getBooleanValue(env.SMTP_STARTTLS ?? env.QQ_SMTP_STARTTLS, false),
    credentials: {
      username: getSmtpUsername(env),
      password: getSmtpPassword(env)
    },
    authType: ['login', 'plain'],
    logLevel: LogLevel.ERROR
  };
}

function getSmtpUsername(env) {
  return getStringValue(env.SMTP_USERNAME)
    || getStringValue(env.QQ_SMTP_USERNAME)
    || normalizeEmail(env.SENDER_EMAIL);
}

function getSmtpPassword(env) {
  return getStringValue(env.SMTP_PASSWORD)
    || getStringValue(env.SMTP_AUTH_CODE)
    || getStringValue(env.QQ_SMTP_AUTH_CODE)
    || getStringValue(env.QQ_SMTP_FORWARD_AUTH_CODE);
}

function getSmtpFromEmail(env) {
  return normalizeEmail(
    getStringValue(env.SMTP_FROM_ADDRESS)
      || getStringValue(env.QQ_SMTP_FROM_ADDRESS)
      || getStringValue(env.SENDER_EMAIL)
      || getStringValue(env.SMTP_USERNAME)
      || getStringValue(env.QQ_SMTP_USERNAME)
  );
}

function getStringValue(value) {
  if (typeof value !== 'string') return '';
  return value.trim();
}

function getIntValue(value, fallback) {
  const parsed = Number.parseInt(String(value ?? ''), 10);
  return Number.isFinite(parsed) && parsed > 0 ? parsed : fallback;
}

function getBooleanValue(value, fallback) {
  if (value === undefined || value === null || value === '') return fallback;
  if (typeof value === 'boolean') return value;
  const normalized = String(value).trim().toLowerCase();
  if (['true', '1', 'yes', 'on'].includes(normalized)) return true;
  if (['false', '0', 'no', 'off'].includes(normalized)) return false;
  return fallback;
}

async function readCounter(env, key) {
  const value = await env.CV_TOKENS.get(key);
  const parsed = Number.parseInt(value || '0', 10);
  return Number.isFinite(parsed) && parsed > 0 ? parsed : 0;
}

async function incrementCounter(env, key) {
  const value = await readCounter(env, key);
  const nextValue = value + 1;
  await env.CV_TOKENS.put(key, String(nextValue));
  return nextValue;
}

function generateToken() {
  const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789';
  const bytes = new Uint8Array(6);
  crypto.getRandomValues(bytes);
  return Array.from(bytes, value => chars[value % chars.length]).join('');
}

function normalizeToken(value) {
  const token = String(value || '').trim().toUpperCase();
  return /^[A-Z0-9]{6}$/.test(token) ? token : '';
}

function normalizeEmail(value) {
  const email = String(value || '').trim().toLowerCase();
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email) ? email : '';
}

function getEmailErrorStatus(error) {
  if (error?.code === 'E_RATE_LIMIT_EXCEEDED') return 429;
  if (error?.code === 'CONFIG_ERROR') return 503;
  return 500;
}

function getEmailErrorMessage(error, fallback) {
  switch (error?.code) {
    case 'CONFIG_ERROR':
      return error.message || 'SMTP 邮件服务尚未配置';
    default:
      if (/auth|login|credential|password/i.test(error?.message || '')) {
        return 'SMTP 登录失败，请检查邮箱授权码';
      }
      return fallback;
  }
}

function formatTimestamp(isoString) {
  return new Date(isoString).toLocaleString('en-US', {
    timeZone: 'Asia/Shanghai',
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
    hour: '2-digit',
    minute: '2-digit',
    second: '2-digit'
  });
}

function escapeHtml(value) {
  return String(value ?? '')
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;');
}

function renderSimpleEmailLayout(contentHtml, headerTitle = 'PersonalINFO', footerHtml = '', options = {}) {
  const safeHeaderTitle = escapeHtml(headerTitle);
  const finalFooterHtml = footerHtml || '<a href="https://github.com/amine123max" target="_blank" rel="noopener noreferrer" style="text-decoration:underline; color:#9ca3af !important;"><span style="color:#9ca3af !important;">GitHub</span></a>';
  const dividerWidth = options.dividerWidth || '100%';
  const dividerPaddingLeft = options.dividerPaddingLeft || '0';
  const dividerCentered = options.dividerCentered ? 'margin:0 auto;' : 'margin:0;';

  return `
    <!DOCTYPE html>
    <html lang="en">
    <head>
      <meta charset="UTF-8">
      <meta name="viewport" content="width=device-width, initial-scale=1.0">
      <title>PersonalINFO Mail</title>
    </head>
    <body style="margin:0; padding:0; background:#ffffff; color:#1f2937; font-family:-apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, 'Helvetica Neue', Arial, sans-serif;">
      <table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0" style="background:#ffffff;">
        <tr>
          <td align="center" style="padding:54px 20px 44px;">
            <table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0" style="max-width:520px;">
              <tr>
                <td style="padding:0 0 28px; font-size:28px; line-height:1.15; font-weight:800; color:#111111; letter-spacing:-0.01em; font-family:Arial, sans-serif;">
                  ${safeHeaderTitle}
                </td>
              </tr>
              ${contentHtml}
              <tr>
                <td style="padding:28px 0 0 ${dividerPaddingLeft};">
                  <div style="width:${dividerWidth}; height:1px; background:#e5e7eb; line-height:1px; font-size:1px; ${dividerCentered}">&nbsp;</div>
                </td>
              </tr>
              <tr>
                <td style="padding:16px 0 0; font-size:22px; line-height:1.2; font-weight:800; color:#111111; letter-spacing:-0.01em; font-family:Arial, sans-serif;">
                  ${safeHeaderTitle}
                </td>
              </tr>
              <tr>
                <td style="padding:10px 0 0; font-size:13px; line-height:1.6; color:#6b7280;">
                  ${finalFooterHtml}
                </td>
              </tr>
            </table>
          </td>
        </tr>
      </table>
    </body>
    </html>
  `;
}

function generateVisitorEmail(token) {
  const safeToken = escapeHtml(token);
  return renderSimpleEmailLayout(`
    <tr>
      <td style="padding:0 0 12px;">
        <table role="presentation" align="center" width="320" cellpadding="0" cellspacing="0" border="0" style="width:320px; margin:0 auto;">
          <tr>
            <td style="font-size:16px; line-height:1.6; color:#1f2937; text-align:left;">
              Enter this temporary token to continue:
            </td>
          </tr>
        </table>
      </td>
    </tr>
    <tr>
      <td style="padding:0 0 18px;">
        <table role="presentation" align="center" width="320" cellpadding="0" cellspacing="0" border="0" style="width:320px; margin:0 auto; background:#f3f4f6; border-radius:14px;">
          <tr>
            <td align="center" style="padding:18px 20px; font-size:34px; line-height:1; font-weight:500; letter-spacing:4px; color:#374151; font-family:ui-monospace, SFMono-Regular, Menlo, Monaco, Consolas, 'Liberation Mono', 'Courier New', monospace; text-align:center !important;">
              <div style="display:block; width:100%; text-align:center !important;">${safeToken}</div>
            </td>
          </tr>
        </table>
      </td>
    </tr>
    <tr>
      <td style="padding:0 0 10px;">
        <table role="presentation" align="center" width="320" cellpadding="0" cellspacing="0" border="0" style="width:320px; margin:0 auto;">
          <tr>
            <td style="font-size:14px; line-height:1.7; color:#4b5563; text-align:left;">
              This token expires in 5 minutes and can be used once.
            </td>
          </tr>
        </table>
      </td>
    </tr>
  `, 'Token', '', { dividerWidth: '320px', dividerCentered: true });
}

function generateAdminDownloadEmail(email, reason, requestTime, downloadTime) {
  const safeEmail = escapeHtml(email);
  const safeReason = escapeHtml(reason);
  const safeRequestTime = escapeHtml(requestTime);
  const safeDownloadTime = escapeHtml(downloadTime);

  return renderSimpleEmailLayout(`
    <tr>
      <td style="padding:0 0 14px 84px; font-size:14px; line-height:1.7; color:#374151;">
        User <a href="mailto:${safeEmail}" style="color:#2563eb; text-decoration:none;">${safeEmail}</a> completed the download via the verification flow.
      </td>
    </tr>
    <tr>
      <td style="padding:0 0 18px 84px;">
        <table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0" style="background:#ffffff; border:1px solid #e5e7eb; border-radius:12px;">
          <tr>
            <td style="padding:14px 16px;">
              <p style="margin:0 0 6px; font-size:12px; line-height:1.4; color:#6b7280; text-transform:uppercase; letter-spacing:0.06em;">Email</p>
              <p style="margin:0 0 12px; font-size:14px; line-height:1.65; color:#111111; word-break:break-all;">${safeEmail}</p>

              <p style="margin:0 0 6px; font-size:12px; line-height:1.4; color:#6b7280; text-transform:uppercase; letter-spacing:0.06em;">Reason</p>
              <p style="margin:0 0 12px; font-size:14px; line-height:1.65; color:#111111; white-space:pre-wrap;">${safeReason}</p>

              <p style="margin:0 0 6px; font-size:12px; line-height:1.4; color:#6b7280; text-transform:uppercase; letter-spacing:0.06em;">Requested</p>
              <p style="margin:0 0 12px; font-size:14px; line-height:1.65; color:#111111;">${safeRequestTime}</p>

              <p style="margin:0 0 6px; font-size:12px; line-height:1.4; color:#6b7280; text-transform:uppercase; letter-spacing:0.06em;">Downloaded</p>
              <p style="margin:0; font-size:14px; line-height:1.65; color:#111111;">${safeDownloadTime}</p>
            </td>
          </tr>
        </table>
      </td>
    </tr>
    <tr>
      <td style="padding:0 0 12px 84px; font-size:14px; line-height:1.7; color:#059669;">
        Verification succeeded and download completed.
      </td>
    </tr>
  `, 'Notification', '', { dividerWidth: '436px', dividerPaddingLeft: '84px' });
}

function jsonResponse(data, status = 200) {
  return new Response(JSON.stringify(data), {
    status,
    headers: {
      ...corsHeaders(),
      'Content-Type': 'application/json'
    }
  });
}

function corsHeaders() {
  return {
    'Access-Control-Allow-Origin': '*',
    'Access-Control-Allow-Methods': 'POST, GET, OPTIONS',
    'Access-Control-Allow-Headers': 'Content-Type'
  };
}
