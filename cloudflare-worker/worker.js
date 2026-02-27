export default {
  async fetch(request, env) {
    const url = new URL(request.url);
    
    if (request.method === 'OPTIONS') {
      return new Response(null, {
        headers: {
          'Access-Control-Allow-Origin': '*',
          'Access-Control-Allow-Methods': 'POST, GET, OPTIONS',
          'Access-Control-Allow-Headers': 'Content-Type',
        },
      });
    }

    if (url.pathname === '/api/request' && request.method === 'POST') {
      return handleRequest(request, env);
    } else if (url.pathname === '/api/verify' && request.method === 'POST') {
      return handleVerify(request, env);
    } else if (url.pathname === '/api/download' && request.method === 'POST') {
      return handleDownload(request, env);
    } else {
      return jsonResponse({ error: 'Not Found' }, 404);
    }
  }
};

async function handleRequest(request, env) {
  try {
    const { email, reason } = await request.json();

    if (!email || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
      return jsonResponse({ success: false, message: '邮箱格式不正确' }, 400);
    }

    if (!reason || reason.trim().length < 5) {
      return jsonResponse({ success: false, message: '请填写下载原因（至少5个字符）' }, 400);
    }

    const token = generateToken();
    const timestamp = new Date().toISOString();
    
    const tokenData = {
      email,
      reason,
      timestamp,
      downloaded: false,
      downloadTime: null
    };
    
    await env.CV_TOKENS.put(token, JSON.stringify(tokenData), {
      expirationTtl: 300
    });

    const tokenDisplay = token;

    await sendEmailWithResend(env.RESEND_API_KEY, {
      from: `${env.SENDER_NAME} <${env.SENDER_EMAIL}>`,
      to: email,
      subject: `[PersonalINFO] Thanks for your interest — Your download token: ${tokenDisplay}`,
      html: generateVisitorEmail(tokenDisplay)
    });

    return jsonResponse({ 
      success: true, 
      message: '申请已提交！下载链接已发送至您的邮箱，请查收（5分钟内有效，仅可下载一次）'
    });

  } catch (error) {
    console.error('处理申请失败:', error);
    return jsonResponse({ 
      success: false, 
      message: '发送失败，请稍后重试' 
    }, 500);
  }
}

async function handleVerify(request, env) {
  try {
    const { token } = await request.json();

    if (!token) {
      return jsonResponse({ success: false, message: '缺少令牌' }, 400);
    }

    const data = await env.CV_TOKENS.get(token);
    
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

async function handleDownload(request, env) {
  try {
    const { token } = await request.json();

    if (!token) {
      return jsonResponse({ success: false, message: '缺少令牌' }, 400);
    }

    const data = await env.CV_TOKENS.get(token);
    
    if (!data) {
      return jsonResponse({ success: false, message: '令牌无效或已过期' }, 401);
    }

    const tokenData = JSON.parse(data);
    
    if (tokenData.downloaded) {
      return jsonResponse({ success: false, message: '此令牌已使用过' }, 401);
    }
    
    tokenData.downloaded = true;
    tokenData.downloadTime = new Date().toISOString();
    
    await env.CV_TOKENS.delete(token);

    const cnTime = formatTimestamp(tokenData.downloadTime);
    await sendEmailWithResend(env.RESEND_API_KEY, {
      from: `PersonalINFO System <${env.SENDER_EMAIL}>`,
      to: env.ADMIN_EMAIL,
      subject: `[DownloadAlert] New CV download notification — ${tokenData.email}`,
      html: generateAdminDownloadEmail(
        tokenData.email, 
        tokenData.reason,
        formatTimestamp(tokenData.timestamp),
        cnTime
      )
    });

    return jsonResponse({ 
      success: true,
      message: 'Download confirmed'
    });

  } catch (error) {
    console.error('下载处理失败:', error);
    return jsonResponse({ success: false, message: '下载失败' }, 500);
  }
}

function generateToken() {
  const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789';
  let token = '';
  for (let i = 0; i < 6; i++) {
    token += chars.charAt(Math.floor(Math.random() * chars.length));
  }
  return token;
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

async function sendEmailWithResend(apiKey, emailData) {
  const response = await fetch('https://api.resend.com/emails', {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${apiKey}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify(emailData),
  });

  if (!response.ok) {
    const error = await response.text();
    throw new Error(`Resend API Error: ${error}`);
  }

  return response.json();
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
      'Content-Type': 'application/json',
      'Access-Control-Allow-Origin': '*',
    },
  });
}
