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
  const logMessages = [];
  const log = (message) => {
      const timestamp = new Date().toISOString();
      const logEntry = `${timestamp}: ${message}`;
      console.log(logEntry); // Vercel için yine de logla, belki çalışır.
      logMessages.push(logEntry);
  };
  
  log('--- API /send-email function started ---');

  // --- CORS Başlıklarını Ayarla ---
  const origin = req.headers.origin;
  if (allowedOrigins.includes(origin) || process.env.NODE_ENV !== 'production') {
     res.setHeader('Access-Control-Allow-Origin', origin || '*');
  } else if (origin && origin.endsWith('.vercel.app')) {
     res.setHeader('Access-Control-Allow-Origin', origin);
  }
  
  res.setHeader('Access-Control-Allow-Credentials', 'true');
  res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization');

  if (req.method === 'OPTIONS') {
    log('Handling OPTIONS preflight request.');
    res.status(204).end();
    return;
  }

  if (req.method !== 'POST') {
    log(`Method ${req.method} Not Allowed.`);
    res.setHeader('Allow', ['POST', 'OPTIONS']);
    return res.status(405).json({ error: `Method ${req.method} Not Allowed`, logs: logMessages });
  }

  try {
    log('Attempting to parse form data with formidable...');
    const { fields, files } = await new Promise((resolve, reject) => {
        const form = new formidable.IncomingForm({ multiples: true });
        form.parse(req, (err, fields, files) => {
            if (err) {
                log(`Formidable parse error: ${err.message}`);
                return reject(err);
            }
            log('Form data parsed successfully.');
            resolve({ fields, files });
        });
    });

    log(`Parsed fields keys: ${Object.keys(fields).join(', ')}`);
    const fileCount = Object.values(files).flat().length;
    log(`Number of files parsed: ${fileCount}`);

    const submissionField = fields.submission;
    if (!submissionField) {
        log('Validation Error: Missing `submission` field.');
        return res.status(400).json({ error: 'Eksik `submission` alanı.', logs: logMessages });
    }
    const submissionData = JSON.parse(submissionField);
      
    if (!submissionData || !submissionData.answers || !submissionData.subject) {
      log('Validation Error: Incomplete or malformed survey data.');
      return res.status(400).json({ error: 'Eksik veya hatalı anket verisi.', logs: logMessages });
    }
    log('Submission data is valid.');

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
    log('Nodemailer transporter created.');

    let emailBody = '<h1>Yeni Tasarım Keşif Anketi Sonucu</h1>';
    for (const [question, answer] of Object.entries(submissionData.answers)) {
      emailBody += `<p><b>${question}:</b></p><p>${String(answer).replace(/\n/g, '<br>')}</p><hr>`;
    }
    log('Email body constructed.');

    const attachments = Object.values(files).flat().map(file => ({
        filename: file.originalFilename,
        path: file.filepath,
        contentType: file.mimetype,
    }));
    log(`${attachments.length} attachments prepared for admin email.`);

    const adminMailOptions = {
      from: `"Dekorla Anket" <${process.env.SMTP_SENDER_EMAIL}>`,
      to: process.env.SMTP_RECIPIENT_EMAIL,
      subject: submissionData.subject,
      replyTo: submissionData.replyTo,
      html: emailBody,
      attachments: attachments,
    };
    
    log(`Attempting to send email to admin: ${adminMailOptions.to}`);
    await transporter.sendMail(adminMailOptions);
    log('Admin email sent successfully.');
    
    const userEmail = submissionData.replyTo;
    if (userEmail && userEmail.includes('@')) {
        const userConfirmationText = `Merhaba,\n\nDekorla tasarım keşif anketini doldurduğunuz için teşekkür ederiz. Cevaplarınızı aldık ve ekibimiz en kısa sürede sizinle iletişime geçecektir.\n\nTasarım yolculuğunuzda size eşlik etmek için sabırsızlanıyoruz.\n\nSaygılarımızla,\nDekorla Ekibi`;
        const userConfirmationOptions = {
            from: `"Dekorla Tasarım" <${process.env.SMTP_SENDER_EMAIL}>`,
            to: userEmail,
            subject: `Tasarım Keşif Anketiniz Alındı!`,
            text: userConfirmationText,
            html: `<div style="font-family: Arial, sans-serif; line-height: 1.6; color: #333;"><h2 style="color: #1f2937;">Anketiniz için teşekkür ederiz!</h2><p>Merhaba,</p><p>Dekorla tasarım keşif anketini doldurduğunuz için teşekkür ederiz. Cevaplarınızı aldık ve ekibimiz en kısa sürede sizinle iletişime geçecektir.</p><p>Tasarım yolculuğunuzda size eşlik etmek için sabırsızlanıyoruz.</p><br><p>Saygılarımızla,</p><p><b>Dekorla Ekibi</b></p></div>`,
        };
        try {
            log(`Attempting to send confirmation email to user: ${userEmail}`);
            await transporter.sendMail(userConfirmationOptions);
            log('User confirmation email sent successfully.');
        } catch (userMailError) {
            log(`User confirmation email FAILED to send to ${userEmail}: ${userMailError.message}`);
        }
    } else {
        log('No valid user email found to send confirmation.');
    }

    log('--- API /send-email function finished successfully ---');
    return res.status(200).json({ success: true, message: 'Anket başarıyla gönderildi.', logs: logMessages });

  } catch (error) {
    log(`--- FATAL API ERROR ---: ${error.message}`);
    if (error.stack) {
        log(`Stack Trace: ${error.stack}`);
    }
    return res.status(500).json({ 
        error: 'Sunucuda beklenmedik bir hata oluştu: ' + error.message,
        logs: logMessages 
    });
  }
};

export const config = {
  api: {
    bodyParser: false,
  },
};

export default handler;