
// /api/send-email.js
const nodemailer = require('nodemailer');

// Not: CORS yönetimi artık proje seviyesinde vercel.json dosyasından yapılıyor.
// Bu, Vercel üzerindeki en güvenilir yöntemdir ve fonksiyon kodunu temiz tutar.

module.exports = async (req, res) => {
  if (req.method === 'OPTIONS') {
    // vercel.json tarafından yönetilen preflight isteği için sadece başarılı yanıt dön.
    return res.status(200).end();
  }
  
  if (req.method !== 'POST') {
    res.setHeader('Allow', ['POST', 'OPTIONS']);
    return res.status(405).json({ error: `Method ${req.method} Not Allowed` });
  }

  // Buradan sonrası sadece POST istekleri için çalışır.
  try {
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
    return res.status(500).json({ error: 'Sunucuda beklenmedik bir hata oluştu: ' + error.message });
  }
};
