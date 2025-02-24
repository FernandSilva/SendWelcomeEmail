// index.js
const sdk = require("node-appwrite");
const nodemailer = require("nodemailer");
const chromium = require("@sparticuz/chromium");
const puppeteer = require("puppeteer-core");

module.exports = async function (req) {
  const client = new sdk.Client();
  const users = new sdk.Users(client);
  
  client
    .setEndpoint(process.env.VITE_APPWRITE_ENDPOINT)
    .setProject(process.env.VITE_APPWRITE_PROJECT_ID)
    .setKey(process.env.VITE_APPWRITE_API_KEY);
  
  try {
    if (!req || !req.payload) {
      return { success: false, error: "Request payload is missing." };
    }
    
    let payload;
    try {
      payload = JSON.parse(req.payload);
    } catch (err) {
      return { success: false, error: "Invalid JSON format in payload." };
    }
    
    if (!payload.email) {
      return { success: false, error: "User email is missing in payload." };
    }
    
    const userEmail = payload.email;
    const homepageUrl = process.env.HOMEPAGE_URL || "https://grow-buddy.vercel.app";
    
    // Launch Puppeteer
    const browser = await puppeteer.launch({
      args: chromium.args,
      executablePath: await chromium.executablePath(),
      headless: chromium.headless,
    });
    const page = await browser.newPage();
    
    const htmlContent = `
      <!DOCTYPE html>
      <html>
      <head>
        <meta charset="utf-8" />
        <title>Welcome to GrowBuddy!</title>
        <style>
          body {
            font-family: 'Helvetica Neue', Helvetica, Arial, sans-serif;
            background-color: #f0f2f5;
            margin: 0;
            padding: 0;
          }
          .container {
            width: 600px;
            margin: 30px auto;
            background-color: #ffffff;
            border-radius: 8px;
            overflow: hidden;
            box-shadow: 0 2px 5px rgba(0, 0, 0, 0.15);
          }
          .header {
            background-color: #28a745;
            padding: 20px;
            text-align: center;
            color: #ffffff;
          }
          .content {
            padding: 30px;
            text-align: center;
          }
          .button {
            display: inline-block;
            padding: 12px 24px;
            font-size: 16px;
            color: #ffffff;
            background-color: #28a745;
            text-decoration: none;
            border-radius: 4px;
          }
          .footer {
            padding: 15px;
            text-align: center;
            font-size: 12px;
            color: #888888;
            background-color: #f7f7f7;
          }
        </style>
      </head>
      <body>
        <div class="container">
          <div class="header">
            <h1>Welcome to GrowBuddy!</h1>
          </div>
          <div class="content">
            <p>Hi there,</p>
            <p>Thank you for signing up with GrowBuddy. We're excited to have you!</p>
            <a class="button" href="${homepageUrl}" target="_blank">Visit GrowBuddy</a>
          </div>
          <div class="footer">
            &copy; ${new Date().getFullYear()} GrowBuddy. All rights reserved.
          </div>
        </div>
      </body>
      </html>
    `;
    
    await page.setContent(htmlContent, { waitUntil: 'networkidle0' });
    const pdfBuffer = await page.pdf({ format: 'A4' });
    await browser.close();

    // Configure Nodemailer transport
    const transporter = nodemailer.createTransport({
      host: process.env.SMTP_HOST,
      port: parseInt(process.env.SMTP_PORT, 10),
      secure: false, 
      auth: {
        user: process.env.SMTP_USER,
        pass: process.env.SMTP_PASS,
      },
    });

    // Verify SMTP connection explicitly
    try {
      await transporter.verify();
      console.log("✅ SMTP connection successful!");
    } catch (smtpError) {
      console.error("❌ SMTP connection error:", smtpError.message);
      return { success: false, error: "SMTP connection failed: " + smtpError.message };
    }

    const mailOptions = {
      from: process.env.SMTP_USER,
      to: userEmail,
      subject: "Welcome to GrowBuddy!",
      text: "Thank you for signing up. Please see attached PDF for details.",
      attachments: [{ filename: "Welcome.pdf", content: pdfBuffer }],
    };

    await transporter.sendMail(mailOptions);
    console.log("✅ Welcome email sent successfully to:", userEmail);

    return { success: true, message: "Email sent successfully!" };

  } catch (error) {
    console.error("❌ Error:", error.stack);
    return { success: false, error: error.message };
  }
};

