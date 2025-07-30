// /api/send-email.js

// Node.js'in standart modül sistemini (CommonJS) kullanıyoruz.
// Bu, Vercel ortamıyla en yüksek uyumluluğu sağlar.
const nodemailer = require('nodemailer');
const multer = require('multer');

const ALLOWED_ORIGIN = 'https://dekorla.co';

// Multer yapılandırması
const upload = multer({
  storage: multer.memoryStorage(),
  limits: {
    fileSize: 15 * 1024 * 1024, // 15 MB
  },
}).any();

// Middleware'i Promise tabanlı hale getiren yardımcı fonksiyon
function runMiddleware(req, res, fn) {
  return new Promise((resolve, reject) => {
    fn(req, res, (result) => {
      if (result instanceof Error) {
        return reject(result);
      }
      return resolve(result);
    });
  });
}

// Ana sunucusuz fonksiyon
module.exports = async (req, res) => {
  const origin = req.headers.origin;

  // ÖNCE: Her zaman CORS başlıklarını ayarla (eğer kaynak uygunsa).
  // Bu, tarayıcının ilk "preflight" (OPTIONS) isteğine doğru yanıtı garanti eder.
  if (origin === ALLOWED_ORIGIN) {
    res.setHeader('Access-Control-Allow-Origin', origin);
    res.setHeader('Access-Control-Allow-Credentials', 'true');
    res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS');
    res.setHeader('Access-Control-Allow-Headers', 'Origin, X-Requested-With, Content-Type, Accept');
  }

  // Tarayıcının ön kontrol isteğini (preflight) ele al.
  // Bu, asıl POST isteğinin engellenmesini önleyen en kritik adımdır.
  if (req.method === 'OPTIONS') {
    res.status(200).end();
    return;
  }

  // Sadece POST isteklerine devam et.
  if (req.method !== 'POST') {
    res.setHeader('Allow', ['POST', 'OPTIONS']);
    res.status(405).end('Method Not Allowed');
    return;
  }
  
  // Güvenlik: Asıl POST isteği için kaynağı tekrar kontrol et.
  // Bu, OPTIONS kontrolünden sonra ek bir güvenlik katmanıdır.
  if (origin !== ALLOWED_ORIGIN) {
    res.status(403).json({ error: 'Forbidden: Invalid origin.' });
    return;
  }

  try {
    // Form verilerini ve dosyaları işle
    await runMiddleware(req, res, upload);

    const submissionData = JSON.parse(req.body.submission);
    const files = req.files;

    // Nodemailer'ı ortam değişkenleri ile güvenli bir şekilde ayarla
    const transporter = nodemailer.createTransport({
      host: process.env.SMTP_HOST,
      port: parseInt(process.env.SMTP_PORT, 10),
      secure: process.env.SMTP_PORT == '465',
      auth: {
        user: process.env.SMTP_USER,
        pass: process.env.SMTP_PASS,
      },
    });

    // E-posta gövdesini oluştur
    let emailBody = '<h1>Yeni Tasarım Keşif Anketi Sonucu</h1>';
    for (const [question, answer] of Object.entries(submissionData.answers)) {
      emailBody += `<p><b>${question}:</b></p><p>${String(answer).replace(/\n/g, '<br>')}</p><hr>`;
    }

    // E-posta seçenekleri
    const mailOptions = {
      from: `"Dekorla Anket" <${process.env.SMTP_SENDER_EMAIL}>`,
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
    
    // Başarı yanıtı
    res.status(200).json({ success: true, message: 'Anket başarıyla gönderildi.' });

  } catch (error) {
    console.error('API Hatası:', error);

    if (error instanceof multer.MulterError) {
      res.status(400).json({ error: `Dosya yükleme hatası: ${error.message}.` });
      return;
    }
    
    // Genel sunucu hatası
    res.status(500).json({ error: 'Sunucuda beklenmedik bir hata oluştu.' });
  }
};
