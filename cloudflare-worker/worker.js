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
      subject: '【PersonalINFO】感谢您的关注！----- 个人简历推送',
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
      subject: `【DownloadAlert】新的简历下载通知！----- ${tokenData.email}`,
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
  return new Date(isoString).toLocaleString('zh-CN', { 
    timeZone: 'Asia/Shanghai',
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
    hour: '2-digit',
    minute: '2-digit',
    second: '2-digit'
  });
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

function generateVisitorEmail(token) {
  return `
    <!DOCTYPE html>
    <html lang="en">
    <head>
      <meta charset="UTF-8">
      <meta name="viewport" content="width=device-width, initial-scale=1.0">
      <title>CV Download Verification</title>
    </head>
    <body style="margin: 0; padding: 0; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, 'Helvetica Neue', Arial, sans-serif;">
      
      <!-- English Section - Black Background -->
      <div style="background-color: #1b1b1b; padding: 48px 40px;">
        <h1 style="margin: 0 0 8px; font-size: 26px; font-weight: 600; color: #ffffff; text-align: left;">
          PersonalINFO Download Verification
        </h1>
        <p style="margin: 0 0 32px; font-size: 14px; color: #a0a0a0; text-align: left;">
          Your verification code is ready
        </p>
        
        <p style="margin: 0 0 32px; font-size: 15px; line-height: 1.6; color: #d4d4d4; text-align: left;">
          Hello! Thank you for your interest in my PersonalINFO. Please use the verification code below to complete the download.
        </p>
        
        <div style="margin: 0 0 32px; text-align: left;">
          <div style="display: inline-block; background-color: #2d2d2d; padding: 20px 32px; border-radius: 4px;">
            <div style="font-size: 32px; font-weight: 700; letter-spacing: 8px; color: #ffffff; font-family: 'Courier New', monospace;">
              ${token}
            </div>
          </div>
        </div>
        
        <p style="margin: 0 0 16px; font-size: 13px; color: #808080; text-align: left;">
          Valid for 5 minutes, single use only.
        </p>
        
        <p style="margin: 0; font-size: 13px; color: #606060; text-align: left;">
          If you didn't request this, please ignore this email.
        </p>
      </div>
      
      <!-- Chinese Section - White Background -->
      <div style="background-color: #ffffff; padding: 48px 40px;">
        <h1 style="margin: 0 0 8px; font-size: 26px; font-weight: 600; color: #1b1b1b; text-align: left;">
          简历下载验证码
        </h1>
        <p style="margin: 0 0 32px; font-size: 14px; color: #666666; text-align: left;">
          你的验证码已准备好
        </p>
        
        <p style="margin: 0 0 32px; font-size: 15px; line-height: 1.6; color: #333333; text-align: left;">
          你好！感谢你对我的简历感兴趣。请使用下方的验证码完成下载。
        </p>
        
        <div style="margin: 0 0 32px; text-align: left;">
          <div style="display: inline-block; background-color: #f5f5f5; padding: 20px 32px; border-radius: 4px;">
            <div style="font-size: 32px; font-weight: 700; letter-spacing: 8px; color: #1b1b1b; font-family: 'Courier New', monospace;">
              ${token}
            </div>
          </div>
        </div>
        
        <p style="margin: 0 0 16px; font-size: 13px; color: #808080; text-align: left;">
          5分钟内有效，仅可使用一次。
        </p>
        
        <p style="margin: 0; font-size: 13px; color: #999999; text-align: left;">
          如果这不是你的操作，请忽略此邮件。
        </p>
      </div>
      
      <!-- Footer -->
      <div style="background-color: #f8f8f8; padding: 24px 40px;">
        <p style="margin: 0; font-size: 11px; color: #999999; text-align: left; line-height: 1.6;">
          This is an automated email, please do not reply.<br>
          此邮件由系统自动发送，请勿回复。
        </p>
      </div>
      
    </body>
    </html>
  `;
}

function generateAdminDownloadEmail(email, reason, requestTime, downloadTime) {
  return `
    <!DOCTYPE html>
    <html lang="en">
    <head>
      <meta charset="UTF-8">
      <meta name="viewport" content="width=device-width, initial-scale=1.0">
      <title>CV Download Notification</title>
    </head>
    <body style="margin: 0; padding: 0; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, 'Helvetica Neue', Arial, sans-serif;">
      
      <!-- English Section - Black Background -->
      <div style="background-color: #1b1b1b; padding: 48px 40px;">
        <h1 style="margin: 0 0 8px; font-size: 26px; font-weight: 600; color: #ffffff; text-align: left;">
          PersonalINFO Download Notification
        </h1>
        <p style="margin: 0 0 32px; font-size: 14px; color: #a0a0a0; text-align: left;">
          Your PersonalINFO was successfully downloaded
        </p>
        
        <p style="margin: 0 0 32px; font-size: 15px; line-height: 1.6; color: #d4d4d4; text-align: left;">
          The user <strong style="color: #ffffff;">${email}</strong> has successfully downloaded your CV using the verification system.
        </p>
        
        <p style="margin: 0 0 8px; font-size: 13px; color: #808080; text-align: left;">
          Email
        </p>
        <p style="margin: 0 0 24px; font-size: 18px; font-weight: 600; color: #ffffff; text-align: left; font-family: 'Courier New', monospace;">
          ${email}
        </p>
        
        <p style="margin: 0 0 8px; font-size: 13px; color: #808080; text-align: left;">
          Reason
        </p>
        <p style="margin: 0 0 24px; font-size: 15px; color: #d4d4d4; text-align: left;">
          ${reason}
        </p>
        
        <p style="margin: 0 0 8px; font-size: 13px; color: #808080; text-align: left;">
          Requested
        </p>
        <p style="margin: 0 0 24px; font-size: 15px; color: #d4d4d4; text-align: left;">
          ${requestTime}
        </p>
        
        <p style="margin: 0 0 8px; font-size: 13px; color: #808080; text-align: left;">
          Downloaded
        </p>
        <p style="margin: 0 0 32px; font-size: 15px; color: #d4d4d4; text-align: left;">
          ${downloadTime}
        </p>
        
        <p style="margin: 0; font-size: 13px; color: #10b981; text-align: left;">
          Verified and downloaded successfully
        </p>
      </div>
      
      <!-- Chinese Section - White Background -->
      <div style="background-color: #ffffff; padding: 48px 40px;">
        <h1 style="margin: 0 0 8px; font-size: 26px; font-weight: 600; color: #1b1b1b; text-align: left;">
          简历下载通知
        </h1>
        <p style="margin: 0 0 32px; font-size: 14px; color: #666666; text-align: left;">
          你的简历已成功下载
        </p>
        
        <p style="margin: 0 0 32px; font-size: 15px; line-height: 1.6; color: #333333; text-align: left;">
          用户 <strong style="color: #1b1b1b;">${email}</strong> 已通过验证系统成功下载了你的简历。
        </p>
        
        <p style="margin: 0 0 8px; font-size: 13px; color: #808080; text-align: left;">
          邮箱
        </p>
        <p style="margin: 0 0 24px; font-size: 18px; font-weight: 600; color: #1b1b1b; text-align: left; font-family: 'Courier New', monospace;">
          ${email}
        </p>
        
        <p style="margin: 0 0 8px; font-size: 13px; color: #808080; text-align: left;">
          下载原因
        </p>
        <p style="margin: 0 0 24px; font-size: 15px; color: #333333; text-align: left;">
          ${reason}
        </p>
        
        <p style="margin: 0 0 8px; font-size: 13px; color: #808080; text-align: left;">
          申请时间
        </p>
        <p style="margin: 0 0 24px; font-size: 15px; color: #333333; text-align: left;">
          ${requestTime}
        </p>
        
        <p style="margin: 0 0 8px; font-size: 13px; color: #808080; text-align: left;">
          下载时间
        </p>
        <p style="margin: 0 0 32px; font-size: 15px; color: #333333; text-align: left;">
          ${downloadTime}
        </p>
        
        <p style="margin: 0; font-size: 13px; color: #10b981; text-align: left;">
          验证成功，已完成下载
        </p>
      </div>
      
      <!-- Footer -->
      <div style="background-color: #f8f8f8; padding: 24px 40px;">
        <p style="margin: 0; font-size: 11px; color: #999999; text-align: left; line-height: 1.6;">
          This is an automated email, please do not reply.<br>
          此邮件由系统自动发送，请勿回复。
        </p>
      </div>
      
    </body>
    </html>
  `;
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
