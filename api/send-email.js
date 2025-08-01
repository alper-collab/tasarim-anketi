// /api/send-email.js
const nodemailer = require('nodemailer');
const cors = require('cors');

// İzin verilen kaynakların (origin) güvenli listesi
const allowedOrigins = [
  'https://dekorla.co',
  'https://dekorla.myshopify.com'
];

// CORS ayarları: Sadece beyaz listedeki kaynaklara izin ver ve credentials'ı destekle.
const corsMiddleware = cors({
  origin: function (origin, callback) {
    // Tarayıcı dışı istekler (server-to-server) veya mobil uygulamalar için `origin` başlığı olmayabilir.
    if (!origin || allowedOrigins.indexOf(origin) !== -1) {
      callback(null, true);
    } else {
      callback(new Error('Bu kaynağın CORS politikası tarafından erişimine izin verilmiyor.'));
    }
  },
  methods: ['POST', 'OPTIONS'], // Tarayıcının preflight isteği için OPTIONS metoduna izin ver.
  allowedHeaders: ['Content-Type'], // JSON gönderimi için Content-Type başlığına izin ver.
  credentials: true,
});

// Vercel'de middleware çalıştırmak için yardımcı fonksiyon
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
  try {
    // 1. CORS MİDDLEWARE'İNİ ÇALIŞTIR.
    // Bu, gelen isteğin kaynağını kontrol eder ve doğru CORS başlıklarını `res` nesnesine ekler.
    await runMiddleware(req, res, corsMiddleware);

    // 2. PREFLIGHT (OPTIONS) İSTEĞİNİ AÇIKÇA ELE AL.
    // `cors` middleware'i başlıkları ayarladıktan sonra, preflight isteği için
    // başarılı bir yanıt (204 No Content) gönderip işlemi sonlandırmalıyız.
    // Bu, tarayıcının sonraki POST isteğini göndermesine izin verir.
    if (req.method === 'OPTIONS') {
      res.writeHead(204);
      res.end();
      return;
    }

    // 3. SADECE POST İSTEKLERİNE DEVAM ET.
    if (req.method === 'POST') {
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

    } else {
      // POST ve OPTIONS dışındaki tüm metodları reddet.
      res.setHeader('Allow', ['POST', 'OPTIONS']);
      return res.status(405).json({ error: `Method ${req.method} Not Allowed` });
    }

  } catch (error) {
    console.error('API Hatası:', error);
    if (error.message.includes('CORS')) {
        return res.status(403).json({ error: 'Erişim engellendi: Geçersiz kaynak.' });
    }
    return res.status(500).json({ error: 'Sunucuda beklenmedik bir hata oluştu.' });
  }
};
