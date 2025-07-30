// /api/send-email.js
const nodemailer = require('nodemailer');
const multer = require('multer');

// Güvenlik için sadece belirli domainlerden gelen isteklere izin ver.
const allowedOrigins = ['https://dekorla.co', 'https://admin.shopify.com'];

// Multer ayarları: Bellekte saklama ve dosya boyutu limiti (15MB)
const upload = multer({
  storage: multer.memoryStorage(),
  limits: { fileSize: 15 * 1024 * 1024 } 
}).any();

// Middleware'i Promise tabanlı hale getiren yardımcı fonksiyon
// Bu, async/await ile daha temiz bir kullanım sağlar.
const runMiddleware = (req, res, fn) => {
  return new Promise((resolve, reject) => {
    fn(req, res, (result) => {
      if (result instanceof Error) {
        return reject(result);
      }
      return resolve(result);
    });
  });
};

// Ana sunucusuz fonksiyon (async/await ile)
module.exports = async (req, res) => {
  // CORS Başlıklarını Ayarla
  const origin = req.headers.origin;
  if (allowedOrigins.includes(origin)) {
    res.setHeader('Access-Control-Allow-Origin', origin);
  }
  
  res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Origin, X-Requested-With, Content-Type, Accept');
  res.setHeader('Access-Control-Allow-Credentials', 'true');

  // Tarayıcının gönderdiği "preflight" OPTIONS isteğini işle
  if (req.method === 'OPTIONS') {
    return res.status(204).end(); // 204 No Content, en doğru yanıttır.
  }
  
  // Sadece POST isteklerine izin ver
  if (req.method !== 'POST') {
    res.setHeader('Allow', ['POST']);
    return res.status(405).end(`Method ${req.method} Not Allowed`);
  }

  try {
    // Multer middleware'ini çalıştırarak form verilerini işle
    await runMiddleware(req, res, upload);
    
    // Gelen verileri ayrıştır
    const submissionData = JSON.parse(req.body.submission);
    const files = req.files;
    
    // Nodemailer transporter'ı ayarla (Environment Variables kullanarak)
    const transporter = nodemailer.createTransport({
      host: process.env.SMTP_HOST,
      port: process.env.SMTP_PORT,
      secure: process.env.SMTP_PORT == 465,
      auth: {
        user: process.env.SMTP_USER,
        pass: process.env.SMTP_PASS,
      },
    });

    // E-posta gövdesini oluştur
    let emailBody = '<h1>Yeni Tasarım Keşif Anketi</h1>';
    for (const [question, answer] of Object.entries(submissionData.answers)) {
      emailBody += `<p><b>${question}:</b> ${answer}</p>`;
    }
    
    // E-posta seçeneklerini tanımla
    const mailOptions = {
      from: `"Anket Formu" <${process.env.SMTP_SENDER_EMAIL}>`,
      to: process.env.SMTP_RECIPIENT_EMAIL,
      subject: submissionData.subject,
      replyTo: submissionData.replyTo,
      html: emailBody,
      attachments: files.map((file) => ({
        filename: file.originalname,
        content: file.buffer,
        contentType: file.mimetype,
      })),
    };
    
    // E-postayı gönder
    await transporter.sendMail(mailOptions);
    
    // Başarılı yanıtı gönder
    res.status(200).json({ message: 'E-posta başarıyla gönderildi.' });

  } catch (error) {
    console.error('API Hatası:', error);
    
    // Hata tipine göre daha anlamlı bir yanıt dön
    if (error instanceof multer.MulterError) {
      return res.status(400).json({ error: `Dosya yükleme hatası: ${error.message}` });
    } else if (error.message.includes('JSON.parse')) {
      return res.status(400).json({ error: 'Geçersiz form verisi formatı.' });
    }
    
    // Genel sunucu hatası
    res.status(500).json({ error: 'Sunucu tarafında bir hata oluştu. Lütfen tekrar deneyin.' });
  }
};
