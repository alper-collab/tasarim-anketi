// /api/send-email.js
const nodemailer = require('nodemailer');

// Middleware to handle CORS and preflight requests
const allowCors = (fn) => async (req, res) => {
  res.setHeader('Access-Control-Allow-Credentials', 'true');

  // Dynamically allow origins including vercel previews
  const origin = req.headers.origin;
  const allowedOrigins = [
      'https://dekorla.co', 
      'https://admin.shopify.com',
  ];

  // Allow any vercel.app or shopify.com subdomain
  if (origin && (allowedOrigins.includes(origin) || origin.endsWith('.vercel.app') || origin.endsWith('.myshopify.com'))) {
      res.setHeader('Access-Control-Allow-Origin', origin);
  }

  res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization');

  // Handle preflight request
  if (req.method === 'OPTIONS') {
    res.status(204).end();
    return;
  }

  // Pass to the actual handler
  return await fn(req, res);
};

// Main email sending logic
const handler = async (req, res) => {
  if (req.method !== 'POST') {
    res.setHeader('Allow', ['POST', 'OPTIONS']);
    return res.status(405).json({ error: `Method ${req.method} Not Allowed` });
  }

  try {
    const { subject, replyTo, answers } = req.body;
    if (!answers || !subject || !replyTo) {
      return res.status(400).json({ error: 'Eksik veri: "subject", "replyTo", ve "answers" alanları zorunludur.' });
    }

    const transporter = nodemailer.createTransport({
      host: process.env.SMTP_HOST,
      port: parseInt(process.env.SMTP_PORT, 10) || 587,
      secure: (process.env.SMTP_PORT === '465'),
      auth: {
        user: process.env.SMTP_USER,
        pass: process.env.SMTP_PASS,
      },
      connectionTimeout: 10000, // 10 seconds
      greetingTimeout: 10000, // 10 seconds
      socketTimeout: 10000, // 10 seconds
    });
    
    // Verify connection configuration
    await transporter.verify();

    let emailBody = `<h1>${subject}</h1>`;
    emailBody += `<p><b>Yanıtlayan:</b> ${replyTo}</p><hr>`;
    for (const [question, answer] of Object.entries(answers)) {
      emailBody += `<div><b>${question}:</b><br>${String(answer || 'Cevaplanmadı').replace(/\n/g, '<br>')}</div><hr>`;
    }
    
    const mailOptions = {
      from: `"Dekorla Anket" <${process.env.SMTP_SENDER_EMAIL}>`,
      to: process.env.SMTP_RECIPIENT_EMAIL,
      subject: subject,
      replyTo: replyTo,
      html: emailBody,
    };

    await transporter.sendMail(mailOptions);
    
    return res.status(200).json({ success: true, message: 'Anket başarıyla gönderildi.' });

  } catch (error) {
    console.error('API Hatası:', error);
    const errorMessage = error.code === 'ECONNECTION' 
      ? 'E-posta sunucusuna bağlanılamadı. Lütfen sunucu ayarlarınızı kontrol edin.'
      : 'Sunucuda bir e-posta gönderme hatası oluştu.';
    return res.status(500).json({ error: errorMessage, details: error.message });
  }
};

// Wrap the handler with the CORS middleware
module.exports = allowCors(handler);
