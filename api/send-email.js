// /api/send-email.js
const nodemailer = require('nodemailer');

// --- CORS Middleware ---
// Bu ara katman, gelen her isteği kontrol eder ve CORS başlıklarını ayarlar.
const corsMiddleware = (req, res) => {
  return new Promise((resolve) => {
    const allowedOrigins = [
      'https://dekorla.co',
      'https://admin.shopify.com',
    ];
    const origin = req.headers.origin;

    // Gelen isteğin kaynağı izin verilenler listesindeyse veya bir Shopify önizleme/admin alan adından geliyorsa izin ver.
    // 'endsWith' kontrolü, Shopify'ın dinamik önizleme URL'lerini yakalamak için kritiktir.
    if (allowedOrigins.includes(origin) || (origin && origin.endsWith('.myshopify.com'))) {
      res.setHeader('Access-Control-Allow-Origin', origin);
    }
    
    res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS');
    res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization');
    res.setHeader('Access-Control-Allow-Credentials', 'true');

    // Tarayıcının gönderdiği "preflight" (ön kontrol) OPTIONS isteği ise,
    // 204 (No Content) ile yanıt ver ve ana fonksiyona geçme.
    if (req.method === 'OPTIONS') {
      res.status(204).end();
      // Middleware'in isteği sonlandırdığını belirtmek için 'true' resolve et.
      return resolve(true); 
    }
    
    // İstek OPTIONS değilse, ana fonksiyona devam edileceğini belirtmek için 'false' resolve et.
    return resolve(false);
  });
};

// --- E-posta Gönderme Fonksiyonu ---
const sendEmailHandler = async (req, res) => {
  if (req.method !== 'POST') {
    res.setHeader('Allow', ['POST', 'OPTIONS']);
    return res.status(405).json({ error: `Method ${req.method} Not Allowed` });
  }

  try {
    const submissionData = req.body;
    if (!submissionData || !submissionData.answers || !submissionData.subject) {
      return res.status(400).json({ error: 'Eksik veya hatalı veri yapısı.' });
    }

    const transporter = nodemailer.createTransport({
      host: process.env.SMTP_HOST,
      port: parseInt(process.env.SMTP_PORT, 10),
      secure: process.env.SMTP_PORT === '465',
      auth: {
        user: process.env.SMTP_USER,
        pass: process.env.SMTP_PASS,
      },
    });

    let emailBody = `<h1>${submissionData.subject}</h1>`;
    emailBody += `<p><b>Yanıtlayan:</b> ${submissionData.replyTo}</p><hr>`;
    for (const [question, answer] of Object.entries(submissionData.answers)) {
      emailBody += `<p><b>${question}:</b></p><p>${String(answer).replace(/\n/g, '<br>')}</p><hr>`;
    }
    
    const mailOptions = {
      from: `"Dekorla Anket" <${process.env.SMTP_SENDER_EMAIL}>`,
      to: process.env.SMTP_RECIPIENT_EMAIL,
      subject: submissionData.subject,
      replyTo: submissionData.replyTo,
      html: emailBody,
    };

    await transporter.sendMail(mailOptions);
    
    return res.status(200).json({ success: true, message: 'Anket başarıyla gönderildi.' });

  } catch (error) {
    console.error('API Hatası:', error);
    return res.status(500).json({ error: 'Sunucuda bir e-posta gönderme hatası oluştu.' });
  }
};

// --- Ana Handler ---
// Vercel tarafından çağrılacak olan ana export budur.
module.exports = async (req, res) => {
  // Önce CORS middleware'ini çalıştır.
  const isOptionsRequestHandled = await corsMiddleware(req, res);

  // Eğer istek bir OPTIONS isteği idiyse ve middleware tarafından zaten sonlandırıldıysa,
  // e-posta gönderme mantığına hiç girme.
  if (isOptionsRequestHandled) {
    return;
  }

  // İstek POST ise, e-posta gönderme fonksiyonunu çalıştır.
  return await sendEmailHandler(req, res);
};
