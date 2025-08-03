
// /api/send-email.js
const nodemailer = require('nodemailer');

// CORS izinlerini yönetmek için bir "middleware" fonksiyonu.
// Bu, gelen her isteğin başında çalışarak doğru başlıkları ayarlar.
const allowCors = (fn) => async (req, res) => {
  const allowedOrigins = [
    'https://dekorla.co',
    'https://dekorla.myshopify.com',
    'https://admin.shopify.com', // Shopify tema düzenleyici için gerekli
  ];
  
  const origin = req.headers.origin;
  
  // Gelen isteğin kaynağı izin verilenler listesindeyse, başlığı dinamik olarak ayarla.
  // Bu, Shopify önizleme modları da dahil olmak üzere esneklik sağlar.
  if (allowedOrigins.includes(origin) || (origin && origin.endsWith('.myshopify.com'))) {
      res.setHeader('Access-Control-Allow-Origin', origin);
  }
  
  res.setHeader('Access-Control-Allow-Credentials', 'true');
  res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization');

  // Tarayıcılar, asıl POST isteğinden önce bir OPTIONS "preflight" isteği gönderir.
  // Bu isteğe 204 (No Content) ile yanıt vererek devam etme izni vermiş oluruz.
  if (req.method === 'OPTIONS') {
    res.status(204).end();
    return;
  }
  
  // CORS kontrolü yapıldıktan sonra asıl fonksiyonumuzu çalıştır.
  return await fn(req, res);
};

// Asıl e-posta gönderme mantığını içeren fonksiyon
const handler = async (req, res) => {
  // Sadece POST isteklerini kabul et
  if (req.method !== 'POST') {
    res.setHeader('Allow', ['POST', 'OPTIONS']);
    return res.status(405).json({ error: `Method ${req.method} Not Allowed` });
  }

  try {
    // Vercel'in dahili body-parser'ı sayesinde JSON verisi doğrudan req.body'de mevcuttur.
    const submissionData = req.body;

    // Gelen verinin beklenen yapıda olduğunu doğrula
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

    // E-posta içeriğini oluştur
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
    return res.status(500).json({ error: 'Sunucuda beklenmedik bir hata oluştu: ' + error.message });
  }
};

// Handler fonksiyonumuzu CORS middleware'i ile sarmalayarak dışa aktar.
module.exports = allowCors(handler);
