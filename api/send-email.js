
// /api/send-email.js
const nodemailer = require('nodemailer');
const Cors = require('cors');

// İzin verilen kaynakların (origin) güvenli listesi
const allowedOrigins = [
  'https://dekorla.co',
  'https://dekorla.myshopify.com',
];

// CORS middleware'ini yapılandır
const cors = Cors({
  origin: (origin, callback) => {
    // Geliştirme ortamında veya mobil testlerde origin boş olabilir.
    // origin yoksa (sunucu içi istekler, Postman, vb.) veya izin verilenler listesindeyse devam et.
    if (!origin || allowedOrigins.includes(origin)) {
      callback(null, true);
    } else {
      callback(new Error('Bu kaynağın CORS politikası tarafından erişimine izin verilmiyor.'));
    }
  },
  methods: ['POST', 'OPTIONS'],
  allowedHeaders: ['Content-Type'],
  credentials: true,
});

// Middleware'i bir Promise'e dönüştüren yardımcı fonksiyon
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

// Ana API işleyici fonksiyonu
module.exports = async (req, res) => {
  try {
    // 1. CORS middleware'ini her istek için çalıştır
    await runMiddleware(req, res, cors);

    // 2. Tarayıcıdan gelen preflight (OPTIONS) isteğini açıkça işle
    if (req.method === 'OPTIONS') {
      res.status(204).end();
      return;
    }
    
    // 3. Sadece POST metoduna izin ver
    if (req.method !== 'POST') {
      res.setHeader('Allow', ['POST', 'OPTIONS']);
      res.status(405).end(`Method ${req.method} Not Allowed`);
      return;
    }

    // 4. POST isteği için e-posta gönderme mantığı
    const submissionData = req.body;
      
    if (!submissionData || !submissionData.answers || !submissionData.subject) {
      return res.status(400).json({ error: 'Eksik veya hatalı veri gönderildi.' });
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

    let emailBody = '<h1>Yeni Tasarım Keşif Anketi Sonucu</h1>';
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
    if (error.message.includes('CORS')) {
      return res.status(403).json({ error: 'Erişim engellendi: Kaynağa izin verilmiyor.' });
    }
    return res.status(500).json({ error: 'Sunucuda beklenmedik bir hata oluştu.' });
  }
};
