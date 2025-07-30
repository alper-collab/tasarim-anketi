// /api/send-email.js
const nodemailer = require('nodemailer');
const multer = require('multer');

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

// CORS ayarlarını yöneten ve ana fonksiyonu sarmalayan bir "wrapper" fonksiyonu.
// Bu, CORS mantığını iş mantığından ayırarak kodu daha temiz ve yönetilebilir hale getirir.
const allowCors = (fn) => async (req, res) => {
  // İzin verilen kaynakların listesi. Tarayıcıdan gelen 'Origin' başlığı bu listedekilerden
  // biriyle eşleşmelidir.
  const allowedOrigins = [
    'https://dekorla.co',
    'https://www.dekorla.co',
    'https://dekorla.myshopify.com',
    // Vercel'in önizleme (preview) ve geliştirme ortamları için esnek bir kural.
    /https:\/\/tasarim-anketi-.*\.vercel\.app$/,
  ];

  const origin = req.headers.origin;
  const isAllowed = origin && allowedOrigins.some(pattern => {
    if (pattern instanceof RegExp) {
      return pattern.test(origin);
    }
    return origin === pattern;
  });

  // Eğer istek yapan kaynak izin verilenler listesindeyse, o kaynağa özel olarak izin verilir.
  // Bu, 'credentials: "include"' ile yapılan istekler için bir güvenlik gerekliliğidir.
  if (isAllowed) {
    res.setHeader('Access-Control-Allow-Origin', origin);
  }

  // Tarayıcıya hangi metotların, başlıkların ve kimlik bilgisi kullanımının serbest olduğunu bildiren başlıklar.
  res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Origin, X-Requested-With, Content-Type, Accept');
  res.setHeader('Access-Control-Allow-Credentials', 'true');

  // Tarayıcı, asıl POST isteğini göndermeden önce bir 'OPTIONS' isteği (preflight request) gönderir.
  // Bu isteğe 204 (No Content) koduyla yanıt vererek sunucunun CORS'a hazır olduğunu bildiririz.
  if (req.method === 'OPTIONS') {
    res.status(204).end();
    return;
  }
  
  // Asıl iş mantığını (e-posta gönderme) çalıştır.
  return await fn(req, res);
};

// E-postayı gönderen asıl iş mantığı
const handler = async (req, res) => {
  // Güvenlik: Sadece POST metoduyla gelen istekleri kabul et.
  if (req.method !== 'POST') {
    res.setHeader('Allow', ['POST', 'OPTIONS']);
    res.status(405).end(`Method ${req.method} Not Allowed`);
    return;
  }

  try {
    // form-data'yı (dosyalar ve metin verileri) işlemesi için multer middleware'ini çalıştır.
    await runMiddleware(req, res, upload);

    // İstek gövdesinden anket verilerini ve dosyaları al.
    const submissionData = JSON.parse(req.body.submission);
    const files = req.files;

    // Ortam değişkenlerini kullanarak e-posta göndericisini (transporter) güvenli bir şekilde ayarla.
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

    // E-posta seçeneklerini (gönderen, alıcı, konu, ekler vb.) ayarla.
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
    res.status(200).json({ success: true, message: 'Anket başarıyla gönderildi.' });

  } catch (error) {
    console.error('API Hatası:', error);

    // Hatanın türüne göre istemciye anlamlı bir hata mesajı dön.
    if (error instanceof multer.MulterError) {
      return res.status(400).json({ error: `Dosya yükleme hatası: ${error.message}.` });
    }
    
    // Diğer tüm beklenmedik hatalar için genel bir sunucu hatası mesajı dön.
    return res.status(500).json({ error: 'Sunucuda beklenmedik bir hata oluştu.' });
  }
};

// Ana işleyiciyi (handler) CORS sarmalayıcısıyla (allowCors) dışa aktar.
// Bu sayede her istek önce CORS kontrolünden geçer.
module.exports = allowCors(handler);
