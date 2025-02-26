const sdk = require("node-appwrite");
const nodemailer = require("nodemailer");
const chromium = require("@sparticuz/chromium");
const puppeteer = require("puppeteer-core");

module.exports = async function (req, context) {
  context.log("✅ Function execution started.");

  // Initialize Appwrite client
  const client = new sdk.Client();
  client
    .setEndpoint(process.env.VITE_APPWRITE_ENDPOINT)
    .setProject(process.env.VITE_APPWRITE_PROJECT_ID)
    .setKey(process.env.VITE_APPWRITE_API_KEY);

  try {
    // **Check Payload Properly**
    context.log("🔍 Checking request payload...");
    
    if (!req || !req.body) {
      context.error("❌ Request payload missing.");
      return { success: false, error: "Request payload missing." };
    }

    // **Attempt to Parse Payload**
    let payload;
    try {
      payload = req.body; // Appwrite automatically parses JSON, no need for JSON.parse()
      context.log("✅ Parsed Payload:", payload);
    } catch (err) {
      context.error("❌ Invalid JSON format:", err.message);
      return { success: false, error: "Invalid JSON format." };
    }

    // **Check for Required Fields**
    if (!payload.email) {
      context.error("❌ Email field missing in payload.");
      return { success: false, error: "Email is required." };
    }
    const userEmail = payload.email;
    context.log("✅ Email Received:", userEmail);

    const homepageUrl = process.env.HOMEPAGE_URL || "https://grow-buddy.vercel.app";

    // **Launch Puppeteer for PDF Generation**
    context.log("🚀 Launching Puppeteer...");
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
        <title>Welcome to GrowBuddy!</title>
      </head>
      <body>
        <h1>Welcome to GrowBuddy!</h1>
        <p>Thank you for signing up. Visit us at <a href="${homepageUrl}">${homepageUrl}</a></p>
      </body>
      </html>`;

    await page.setContent(htmlContent, { waitUntil: "networkidle0" });
    const pdfBuffer = await page.pdf({ format: "A4" });

    await browser.close();
    context.log("✅ PDF successfully generated.");

    // **Setup Nodemailer SMTP Connection**
    context.log("🔄 Setting up SMTP transporter...");
    const transporter = nodemailer.createTransport({
      host: process.env.SMTP_HOST,
      port: parseInt(process.env.SMTP_PORT, 10),
      secure: false, // TLS
      auth: {
        user: process.env.SMTP_USER,
        pass: process.env.SMTP_PASS,
      },
    });

    // **Verify SMTP Connection**
    try {
      context.log("🔄 Verifying SMTP connection...");
      await transporter.verify();
      context.log("✅ SMTP Connection Successful!");
    } catch (smtpError) {
      context.error("❌ SMTP Connection Failed:", smtpError.message);
      return { success: false, error: "SMTP connection failed: " + smtpError.message };
    }

    // **Send Email**
    const mailOptions = {
      from: process.env.SMTP_USER,
      to: userEmail,
      subject: "Welcome to GrowBuddy!",
      text: "Thanks for signing up! Check out the attached PDF for details.",
      attachments: [
        {
          filename: "Welcome.pdf",
          content: pdfBuffer,
          contentType: "application/pdf",
        },
      ],
    };

    await transporter.sendMail(mailOptions);
    context.log("✅ Welcome email sent successfully to:", userEmail);

    return { success: true, message: "Email sent successfully!" };

  } catch (error) {
    context.error("❌ Function Error:", error.message);
    return { success: false, error: error.message };
  }
};

