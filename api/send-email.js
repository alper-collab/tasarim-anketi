// /api/send-email.js
const nodemailer = require('nodemailer');
const multer = require('multer');

// Güvenlik: İzin verilen kaynakların bir listesi.
const allowedOrigins = [
  'https://dekorla.co',
  'https://www.dekorla.co',
  'https://dekorla.myshopify.com',
  // Vercel'in önizleme (preview) ve test ortamları için esnek bir kural.
  // Proje adıyla başlayan tüm vercel.app alt alan adlarına izin verir.
  /https:\/\/tasarim-anketi-.*\.vercel\.app$/
];

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

  // Gelen isteğin kaynağının izin verilenler listesinde olup olmadığını kontrol et.
  const isAllowed = allowedOrigins.some(pattern => {
    if (!origin) return false;
    if (pattern instanceof RegExp) {
      return pattern.test(origin);
    }
    return origin === pattern;
  });

  // Gelen origin izin verilenler listesindeyse, ilgili başlığı ayarla.
  // Bu, tarayıcının çapraz kaynak isteklerini güvenli bir şekilde yapmasını sağlar.
  if (isAllowed) {
    res.setHeader('Access-Control-Allow-Origin', origin);
  }
  
  // Her zaman gönderilmesi gereken diğer CORS başlıkları.
  // Tarayıcıya hangi metotların ve başlıkların kullanılabileceğini bildirir.
  res.setHeader('Access-Control-Allow-Credentials', 'true');
  res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Origin, X-Requested-With, Content-Type, Accept');

  // Tarayıcının ön kontrol (preflight) isteğini ele al.
  // Bu, asıl POST isteği gönderilmeden önce tarayıcının sunucudan izin istemesidir.
  if (req.method === 'OPTIONS') {
    res.status(204).end();
    return;
  }
  
  // Sadece POST isteklerine devam et, diğerlerini reddet.
  if (req.method !== 'POST') {
    res.setHeader('Allow', ['POST', 'OPTIONS']);
    res.status(405).end(`Method ${req.method} Not Allowed`);
    return;
  }

  // Güvenlik: Asıl POST isteği için origin kontrolü.
  // Eğer origin izin verilenler arasında değilse, isteği reddet.
  if (!isAllowed) {
    res.status(403).json({ error: `Forbidden: Origin '${origin}' is not allowed.` });
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
