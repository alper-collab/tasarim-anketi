
// /api/send-email.js
const nodemailer = require('nodemailer');
const formidable = require('formidable');

// İzin verilen alan adları. Bu adreslerden gelen isteklere izin verilecektir.
const allowedOrigins = [
  'https://dekorla.co',
  /https:\/\/.*\.myshopify\.com$/,
  /https:\/\/.*\.vercel\.app$/,
];

const handler = async (req, res) => {
  const origin = req.headers.origin;
  let isAllowed = false;

  // Gelen isteğin kaynağının izin verilenler listesinde olup olmadığını kontrol et
  if (origin) {
    isAllowed = allowedOrigins.some(o => (typeof o === 'string' ? o === origin : o.test(origin)));
  }

  // Eğer kaynak izin verilenler listesindeyse, CORS başlıklarını ayarla
  if (isAllowed) {
    res.setHeader('Access-Control-Allow-Origin', origin);
    res.setHeader('Access-Control-Allow-Credentials', 'true');
    res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS');
    res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization');
  }

  // Tarayıcıların gönderdiği güvenlik ön kontrol isteğini (preflight) yönet
  if (req.method === 'OPTIONS') {
    if (isAllowed) {
      // İstek izin verilen bir kaynaktan geliyorsa, 204 (No Content) ile yanıt ver.
      // Tarayıcı bu yanıtı alınca asıl POST isteğini gönderecektir.
      return res.status(204).end();
    } else {
      // İzin verilmeyen bir kaynaktan geliyorsa, hatayla yanıt ver.
      return res.status(403).json({ error: 'Origin not allowed' });
    }
  }

  // Eğer istek izin verilmeyen bir kaynaktan geliyorsa, işlemi durdur.
  if (!isAllowed) {
    return res.status(403).json({ error: `Origin '${origin}' is not in the allowed list.` });
  }

  // Sadece POST metotlarına izin ver
  if (req.method !== 'POST') {
    res.setHeader('Allow', ['POST', 'OPTIONS']);
    return res.status(405).json({ error: `Method ${req.method} Not Allowed` });
  }

  // --- Form verilerini işleme ve e-posta gönderme ---
  try {
    const { fields, files } = await new Promise((resolve, reject) => {
        const form = new formidable.IncomingForm({ multiples: true });
        form.parse(req, (err, fields, files) => {
            if (err) {
                console.error(`Formidable parse error: ${err.message}`);
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
    emailBody += '<p>Müşterinin verdiği yanıtlar aşağıdadır:</p><hr>';
    
    for (const [question, answer] of Object.entries(submissionData.answers)) {
      emailBody += `<p><b>${question}:</b></p><p>${String(answer).replace(/\n/g, '<br>')}</p><hr>`;
    }

    const attachments = [];
    let attachmentsHtml = '<h2>Yüklenen Dosyalar</h2>';
    const allFiles = Object.values(files).flat();

    if (allFiles.length > 0) {
        allFiles.forEach(file => {
            const isImage = file.mimetype && file.mimetype.startsWith('image/');
            const cid = isImage ? `${file.newFilename}@dekorla.co` : null;

            attachments.push({
                filename: file.originalFilename,
                path: file.filepath,
                contentType: file.mimetype,
                cid: cid,
            });

            if (isImage) {
                attachmentsHtml += `
                    <p><b>${file.originalFilename}:</b></p>
                    <img src="cid:${cid}" alt="${file.originalFilename}" style="max-width: 100%; height: auto; border: 1px solid #ddd; padding: 5px; margin-top: 5px;" />
                    <hr>
                `;
            } else {
                 attachmentsHtml += `<p><b>Ekli dosya:</b> ${file.originalFilename} (Resim olmadığı için e-postaya ek olarak eklenmiştir.)</p><hr>`;
            }
        });
        emailBody += attachmentsHtml;
    }

    const adminMailOptions = {
      from: `"Dekorla Anket" <${process.env.SMTP_SENDER_EMAIL}>`,
      to: process.env.SMTP_RECIPIENT_EMAIL,
      subject: submissionData.subject,
      replyTo: submissionData.replyTo,
      html: emailBody,
      attachments: attachments,
    };
    
    await transporter.sendMail(adminMailOptions);
    
    const userEmail = submissionData.replyTo;
    if (userEmail && userEmail.includes('@')) {
        const userGreetingHtml = `
            <div style="font-family: Arial, sans-serif; line-height: 1.6; color: #333;">
                <h2 style="color: #1f2937;">Anketiniz için teşekkür ederiz!</h2>
                <p>Merhaba,</p>
                <p>Dekorla tasarım keşif anketini doldurduğunuz için teşekkür ederiz. Cevaplarınızın bir kopyasını aşağıda bulabilirsiniz. Ekibimiz en kısa sürede sizinle iletişime geçecektir.</p>
                <p>Tasarım yolculuğunuzda size eşlik etmek için sabırsızlanıyoruz.</p>
                <br>
                <p>Saygılarımızla,</p>
                <p><b>Dekorla Ekibi</b></p>
            </div>
            <hr>
        `;
        
        const userConfirmationOptions = {
            from: `"Dekorla Tasarım" <${process.env.SMTP_SENDER_EMAIL}>`,
            to: userEmail,
            subject: `✓ Dekorla Tasarım Anketi Yanıtlarınız`,
            html: userGreetingHtml + emailBody,
            attachments: attachments,
        };
        try {
            await transporter.sendMail(userConfirmationOptions);
        } catch (userMailError) {
            console.error(`User confirmation email FAILED to send to ${userEmail}: ${userMailError.message}`);
        }
    }

    return res.status(200).json({ success: true, message: 'Anket başarıyla gönderildi.' });

  } catch (error) {
    console.error(`--- FATAL API ERROR ---: ${error.message}`);
    if (error.stack) {
        console.error(`Stack Trace: ${error.stack}`);
    }
    return res.status(500).json({ 
        error: 'Sunucuda beklenmedik bir hata oluştu: ' + error.message,
    });
  }
};

export const config = {
  api: {
    bodyParser: false,
  },
};

export default handler;
