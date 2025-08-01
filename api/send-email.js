// /api/send-email.js
const nodemailer = require('nodemailer');
const Cors = require('cors');

// İzin verilen kaynakların (origin) güvenli listesi
const allowedOrigins = [
  'https://dekorla.co',
  'https://dekorla.myshopify.com'
];

// CORS middleware'ini yapılandır
const cors = Cors({
  origin: (origin, callback) => {
    // Köken (origin) yoksa (sunucu içi istekler gibi) veya izin verilenler listesindeyse, devam et.
    if (!origin || allowedOrigins.includes(origin)) {
      callback(null, true);
    } else {
      // İzin verilmeyen bir kökense hata fırlat.
      callback(new Error('Bu kaynağın CORS politikası tarafından erişimine izin verilmiyor.'));
    }
  },
  methods: ['POST', 'OPTIONS'],
  allowedHeaders: ['Content-Type'],
  credentials: true,
});

// Ana API işleyici fonksiyonu
module.exports = async (req, res) => {
  try {
    // 1. CORS middleware'ini çalıştır.
    // Bu, gelen isteği bir Promise yapısı içinde sarmalayarak async/await ile uyumlu hale getirir.
    await new Promise((resolve, reject) => {
      cors(req, res, (result) => {
        if (result instanceof Error) {
          return reject(result);
        }
        return resolve(result);
      });
    });

    // 2. Middleware çalıştıktan sonra, eğer istek bir OPTIONS isteğiyse,
    // `cors` kütüphanesi yanıtı zaten göndermiş olmalıdır. Bu yüzden sadece POST metodunu ele almamız yeterli.
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

    } else if (req.method !== 'OPTIONS') {
      // `cors` middleware'i OPTIONS'ı zaten ele aldı. Diğer tüm metodları reddet.
      res.setHeader('Allow', ['POST', 'OPTIONS']);
      return res.status(405).json({ error: `Method ${req.method} Not Allowed` });
    }
    // OPTIONS isteği için, `cors` middleware'i yanıtı sonlandırdığı için burada ek bir işlem yapmaya gerek yok.

  } catch (error) {
    console.error('API Hatası:', error);
    if (error.message.includes('CORS')) {
        return res.status(403).json({ error: 'Erişim engellendi: Geçersiz kaynak.' });
    }
    return res.status(500).json({ error: 'Sunucuda beklenmedik bir hata oluştu.' });
  }
};
