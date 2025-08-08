// /api/send-email.js
const nodemailer = require('nodemailer');
const formidable = require('formidable');

// İzin verilen kaynakların (origin) güvenli listesi
const allowedOrigins = [
  'https://dekorla.co',
  'https://dekorla.myshopify.com',
  // Vercel'in kendi önizleme URL'lerini dinamik olarak eklemek için bir regex de kullanılabilir.
  // Örnek: /tasarim-anketi-.*\.vercel\.app$/
];

const handler = async (req, res) => {
  // --- CORS Başlıklarını Ayarla ---
  const origin = req.headers.origin;
  if (allowedOrigins.includes(origin) || process.env.NODE_ENV !== 'production') {
     res.setHeader('Access-Control-Allow-Origin', origin || '*');
  } else if (origin && origin.endsWith('.vercel.app')) {
     // Vercel önizleme dağıtımlarına izin ver
     res.setHeader('Access-Control-Allow-Origin', origin);
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
                console.error('Formidable parse error:', err);
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

    const attachments = Object.values(files).flat().map(file => ({
        filename: file.originalFilename,
        path: file.filepath,
        contentType: file.mimetype,
    }));

    // ADIM 1: E-postayı yöneticiye gönder
    const adminMailOptions = {
      from: `"Dekorla Anket" <${process.env.SMTP_SENDER_EMAIL}>`,
      to: process.env.SMTP_RECIPIENT_EMAIL,
      subject: submissionData.subject,
      replyTo: submissionData.replyTo,
      html: emailBody,
      attachments: attachments,
    };

    await transporter.sendMail(adminMailOptions);
    
    // ADIM 2: E-postayı kullanıcıya gönder
    const userEmail = submissionData.replyTo;
    if (userEmail && userEmail.includes('@')) {
        const userConfirmationOptions = {
            from: `"Dekorla Tasarım" <${process.env.SMTP_SENDER_EMAIL}>`,
            to: userEmail,
            subject: `Tasarım Keşif Anketiniz Alındı!`,
            html: `
                <div style="font-family: Arial, sans-serif; line-height: 1.6; color: #333;">
                    <h2 style="color: #1f2937;">Anketiniz için teşekkür ederiz!</h2>
                    <p>Merhaba,</p>
                    <p>Dekorla tasarım keşif anketini doldurduğunuz için teşekkür ederiz. Cevaplarınızı aldık ve ekibimiz en kısa sürede sizinle iletişime geçecektir.</p>
                    <p>Tasarım yolculuğunuzda size eşlik etmek için sabırsızlanıyoruz.</p>
                    <br>
                    <p>Saygılarımızla,</p>
                    <p><b>Dekorla Ekibi</b></p>
                </div>
            `,
        };
        try {
            await transporter.sendMail(userConfirmationOptions);
        } catch (userMailError) {
            // Kullanıcıya giden e-posta başarısız olursa bunu sadece logla,
            // ana isteği başarısız kılma çünkü yöneticiye mail gitti.
            console.error(`Kullanıcı onay e-postası gönderilemedi (${userEmail}):`, userMailError);
        }
    }

    return res.status(200).json({ success: true, message: 'Anket başarıyla gönderildi.' });

  } catch (error) {
    console.error('API Hatası:', error);
    return res.status(500).json({ error: 'Sunucuda beklenmedik bir hata oluştu: ' + error.message });
  }
};

export const config = {
  api: {
    bodyParser: false,
  },
};

export default handler;