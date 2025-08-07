// /api/send-email.js
const nodemailer = require('nodemailer');
const formidable = require('formidable');
const fs = require('fs');

// İzin verilen kaynakların (origin) güvenli listesi
const allowedOrigins = [
  'https://dekorla.co',
  'https://dekorla.myshopify.com',
];

const handler = async (req, res) => {
  // --- CORS Başlıklarını Manuel Olarak Ayarla ---
  const origin = req.headers.origin;
  // Geliştirme ortamında veya izin verilenler listesindeyse izin ver
  if (allowedOrigins.includes(origin) || process.env.NODE_ENV !== 'production') {
     res.setHeader('Access-Control-Allow-Origin', origin || '*');
  }
  
  res.setHeader('Access-Control-Allow-Credentials', 'true');
  res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization');

  // --- Preflight (OPTIONS) İsteğini Yönet ---
  if (req.method === 'OPTIONS') {
    res.status(204).end();
    return;
  }

  // --- Asıl POST İsteğini Yönet ---
  if (req.method !== 'POST') {
    res.setHeader('Allow', ['POST', 'OPTIONS']);
    return res.status(405).json({ error: `Method ${req.method} Not Allowed` });
  }

  try {
    // formidable v2 ile uyumlu hale getirildi.
    const { fields, files } = await new Promise((resolve, reject) => {
        const form = new formidable.IncomingForm({ multiples: true });
        form.parse(req, (err, fields, files) => {
            if (err) {
                return reject(err);
            }
            resolve({ fields, files });
        });
    });

    const submissionField = fields.submission;
    if (!submissionField) {
        return res.status(400).json({ error: 'Eksik `submission` alanı.' });
    }
    const submissionData = JSON.parse(submissionField);
      
    if (!submissionData || !submissionData.answers || !submissionData.subject) {
      return res.status(400).json({ error: 'Eksik veya hatalı anket verisi.' });
    }

    const transporter = nodemailer.createTransport({
      host: process.env.SMTP_HOST,
      port: parseInt(process.env.SMTP_PORT, 10),
      secure: process.env.SMTP_PORT === '465',
      auth: {
        user: process.env.SMTP_USER,
        pass: process.env.SMTP_PASS,
      },
      tls: {
        rejectUnauthorized: false
      },
    });

    let emailBody = '<h1>Yeni Tasarım Keşif Anketi Sonucu</h1>';
    for (const [question, answer] of Object.entries(submissionData.answers)) {
      emailBody += `<p><b>${question}:</b></p><p>${String(answer).replace(/\n/g, '<br>')}</p><hr>`;
    }

    // formidable v2'de 'files' nesnesinin yapısı farklıdır
    const attachments = Object.values(files).flat().map(file => ({
        filename: file.originalFilename,
        path: file.filepath, // v2 'path' kullanır
        contentType: file.mimetype,
    }));

    const mailOptions = {
      from: `"Dekorla Anket" <${process.env.SMTP_SENDER_EMAIL}>`,
      to: process.env.SMTP_RECIPIENT_EMAIL,
      subject: submissionData.subject,
      replyTo: submissionData.replyTo,
      html: emailBody,
      attachments: attachments,
    };

    await transporter.sendMail(mailOptions);
    
    return res.status(200).json({ success: true, message: 'Anket başarıyla gönderildi.' });

  } catch (error) {
    console.error('API Hatası:', error);
    return res.status(500).json({ error: 'Sunucuda beklenmedik bir hata oluştu: ' + error.message });
  }
};

// Vercel API route config to disable the default body parser
const config = {
  api: {
    bodyParser: false,
  },
};

module.exports = process.env.NODE_ENV === 'production' 
  ? (req, res) => {
      Object.assign(req, { config });
      return handler(req, res);
    }
  : Object.assign(handler, { config });
