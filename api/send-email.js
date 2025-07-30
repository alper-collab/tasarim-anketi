// /api/send-email.js
import nodemailer from 'nodemailer';
import multer from 'multer';

// İzin verilen tek kaynak. Bu, güvenliği artırır.
const ALLOWED_ORIGIN = 'https://dekorla.co';

// Multer'ı yapılandır: dosyaları bellekte tut ve 15MB ile sınırla.
const upload = multer({
  storage: multer.memoryStorage(),
  limits: {
    fileSize: 15 * 1024 * 1024, // 15 MB
  },
}).any(); // Her türlü dosyayı kabul et.

// Express-tarzı middleware'i (multer gibi) Vercel'in sunucusuz fonksiyonunda
// async/await ile kullanmak için yardımcı fonksiyon.
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

// Ana sunucusuz fonksiyonumuz. Modern `export default` yapısı kullanılıyor.
export default async function handler(req, res) {
  const origin = req.headers.origin;

  // Gelen isteğin kaynağını KESİNLİKLE kontrol et.
  if (origin === ALLOWED_ORIGIN) {
    res.setHeader('Access-Control-Allow-Origin', origin);
    res.setHeader('Access-Control-Allow-Credentials', 'true');
    res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS');
    res.setHeader('Access-Control-Allow-Headers', 'Origin, X-Requested-With, Content-Type, Accept');
  } else {
    // Eğer istek izin verilen kaynaktan gelmiyorsa, hiçbir başlık ayarlama.
    // Bu, güvenlik açısından önemlidir.
  }

  // Tarayıcılar, asıl POST isteğinden önce bir "preflight" (ön kontrol) isteği gönderir.
  // Bu isteğe 204 (No Content) koduyla yanıt vermek, CORS için ZORUNLUDUR.
  if (req.method === 'OPTIONS') {
    return res.status(204).end();
  }

  // Sadece POST isteklerine izin ver.
  if (req.method !== 'POST') {
    res.setHeader('Allow', ['POST']);
    return res.status(405).end('Method Not Allowed');
  }

  try {
    // Multer middleware'ini çalıştırarak form verilerini ve dosyaları işle.
    await runMiddleware(req, res, upload);

    // Form verilerini ayrıştır.
    const submissionData = JSON.parse(req.body.submission);
    const files = req.files;

    // Nodemailer'ı ortam değişkenleri (environment variables) ile güvenli bir şekilde ayarla.
    const transporter = nodemailer.createTransport({
      host: process.env.SMTP_HOST,
      port: process.env.SMTP_PORT,
      secure: process.env.SMTP_PORT == 465, // Eğer port 465 ise SSL kullan.
      auth: {
        user: process.env.SMTP_USER,
        pass: process.env.SMTP_PASS,
      },
    });

    // E-posta gövdesini HTML olarak oluştur.
    let emailBody = '<h1>Yeni Tasarım Keşif Anketi Sonucu</h1>';
    for (const [question, answer] of Object.entries(submissionData.answers)) {
      emailBody += `<p><b>${question}:</b></p><p>${String(answer).replace(/\n/g, '<br>')}</p><hr>`;
    }

    // E-posta seçeneklerini tanımla.
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

    // Her şey yolundaysa, başarı yanıtı gönder.
    return res.status(200).json({ success: true, message: 'Anket başarıyla gönderildi.' });

  } catch (error) {
    console.error('API Hatası:', error);

    // Hata tipine göre istemciye anlamlı bir yanıt gönder.
    if (error instanceof multer.MulterError) {
      return res.status(400).json({ error: `Dosya yükleme hatası: ${error.message}. Lütfen dosya boyutunu kontrol edin.` });
    }
    
    // Genel bir sunucu hatası durumunda.
    return res.status(500).json({ error: 'Sunucuda beklenmedik bir hata oluştu. Lütfen daha sonra tekrar deneyin.' });
  }
}
