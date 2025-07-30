// /api/send-email.js
const nodemailer = require('nodemailer');
const multer = require('multer');

// --- Güvenlik: İzin Verilen Kaynaklar (Origins) ---
// Sadece bu kaynaklardan gelen isteklere izin verilir.
const allowedOrigins = [
  'https://dekorla.co',
  'https://www.dekorla.co',
  'https://dekorla.myshopify.com',
  /https:\/\/tasarim-anketi-.*\.vercel\.app$/, // Vercel önizleme URL'leri için Regex
  'http://localhost:3000', // Yerel geliştirme ortamı
];

// Multer yapılandırması (dosya yükleme işlemi için)
const upload = multer({
  storage: multer.memoryStorage(),
  limits: {
    fileSize: 15 * 1024 * 1024, // Her dosya için 15 MB limit
  },
}).any(); // Birden fazla ve farklı isimlerdeki dosya alanlarını kabul eder

// Middleware'i Promise tabanlı hale getiren yardımcı fonksiyon
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

// Ana API işleyici fonksiyonu
module.exports = async (req, res) => {
  const origin = req.headers.origin;
  
  // 1. Gelen isteğin kaynağını kontrol et ve dinamik olarak CORS başlıklarını ayarla
  if (origin && allowedOrigins.some(pattern => (pattern instanceof RegExp ? pattern.test(origin) : origin === pattern))) {
    res.setHeader('Access-Control-Allow-Origin', origin); // '*' yerine spesifik origin
    res.setHeader('Access-Control-Allow-Credentials', 'true');
    res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS');
    res.setHeader('Access-Control-Allow-Headers', 'Origin, X-Requested-With, Content-Type, Accept');
  } else if (origin) {
    // Eğer kaynak izin verilenler listesinde yoksa, erişimi reddet
    return res.status(403).json({ error: `Erişim reddedildi. İzin verilmeyen kaynak: ${origin}` });
  }

  // 2. Tarayıcının 'preflight' (ön kontrol) isteğini anında işle
  // Bu, tarayıcının asıl POST isteğini göndermeden önce izinleri kontrol etmek için gönderdiği bir OPTIONS isteğidir.
  if (req.method === 'OPTIONS') {
    return res.status(204).end(); // 204 No Content ile yanıtla ve işlemi bitir.
  }

  // 3. Sadece POST isteklerine izin ver (OPTIONS zaten işlendi)
  if (req.method !== 'POST') {
    return res.status(405).json({ error: `Method ${req.method} Not Allowed` });
  }

  // 4. Asıl e-posta gönderme mantığı
  try {
    // form-data'yı işlemesi için multer middleware'ini çalıştır.
    await runMiddleware(req, res, upload);

    // İstek gövdesinden anket verilerini ve dosyaları al.
    const submissionData = JSON.parse(req.body.submission);
    const files = req.files;

    // Ortam değişkenlerini kullanarak e-posta göndericisini güvenli bir şekilde ayarla.
    const transporter = nodemailer.createTransport({
      host: process.env.SMTP_HOST,
      port: parseInt(process.env.SMTP_PORT, 10),
      secure: process.env.SMTP_PORT === '465', // port 465 ise SSL/TLS kullan
      auth: {
        user: process.env.SMTP_USER,
        pass: process.env.SMTP_PASS,
      },
    });

    // E-posta gövdesini (HTML formatında) oluştur.
    let emailBody = '<h1>Yeni Tasarım Keşif Anketi Sonucu</h1>';
    for (const [question, answer] of Object.entries(submissionData.answers)) {
      emailBody += `<p><b>${question}:</b></p><p>${String(answer).replace(/\n/g, '<br>')}</p><hr>`;
    }

    // E-posta seçeneklerini ayarla.
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

    // E-postayı gönder.
    await transporter.sendMail(mailOptions);
    
    // Başarılı olursa istemciye olumlu yanıt dön.
    return res.status(200).json({ success: true, message: 'Anket başarıyla gönderildi.' });

  } catch (error) {
    console.error('API Hatası:', error);

    // Hatanın türüne göre istemciye anlamlı bir hata mesajı dön.
    if (error instanceof multer.MulterError) {
      return res.status(400).json({ error: `Dosya yükleme hatası: ${error.message}.` });
    }
    
    // Diğer tüm beklenmedik hatalar için genel bir sunucu hatası mesajı dön.
    return res.status(500).json({ error: 'Sunucuda beklenmedik bir hata oluştu. Lütfen teknik ekiple iletişime geçin.' });
  }
};
