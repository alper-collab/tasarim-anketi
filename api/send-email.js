// /api/send-email.js
const nodemailer = require('nodemailer');

// Vercel API rotaları için standart export yöntemi kullanılır.
export default async function handler(req, res) {
  // --- CORS Yönetimi ---
  // Gelen her isteğin başında, asıl mantık çalışmadan CORS başlıkları ayarlanır.
  const allowedOrigins = [
    'https://dekorla.co',
    'https://dekorla.myshopify.com',
    'https://admin.shopify.com',
  ];
  const origin = req.headers.origin;

  // Gelen isteğin kaynağı izin verilenler listesindeyse veya bir Shopify önizleme alan adından geliyorsa,
  // Access-Control-Allow-Origin başlığını isteğin geldiği kaynak olarak ayarla.
  if (allowedOrigins.includes(origin) || (origin && origin.endsWith('.myshopify.com'))) {
    res.setHeader('Access-Control-Allow-Origin', origin);
  }
  
  res.setHeader('Access-Control-Allow-Credentials', 'true');
  res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization');

  // Tarayıcının gönderdiği "preflight" (ön kontrol) OPTIONS isteğine 204 (No Content) ile yanıt ver.
  // Bu, asıl POST isteğinin gönderilmesi için izin verildiği anlamına gelir.
  if (req.method === 'OPTIONS') {
    res.status(204).end();
    return;
  }

  // --- Asıl Fonksiyon Mantığı ---
  // Sadece POST isteklerini kabul et.
  if (req.method !== 'POST') {
    res.setHeader('Allow', ['POST', 'OPTIONS']);
    return res.status(405).json({ error: `Method ${req.method} Not Allowed` });
  }

  try {
    // Vercel'in dahili body-parser'ı sayesinde JSON verisi doğrudan req.body'de mevcuttur.
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
    // Hata durumunda istemciye çok fazla detay vermeden genel bir mesaj gönder.
    return res.status(500).json({ error: 'Sunucuda bir e-posta gönderme hatası oluştu.' });
  }
}
