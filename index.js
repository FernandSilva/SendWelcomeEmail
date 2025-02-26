const sdk = require("node-appwrite");
const nodemailer = require("nodemailer");
const chromium = require("@sparticuz/chromium");
const puppeteer = require("puppeteer-core");

module.exports = async function (req, res) {
  console.log("✅ Function execution started.");

  // Initialize Appwrite client
  const client = new sdk.Client();
  client
    .setEndpoint(process.env.VITE_APPWRITE_ENDPOINT)
    .setProject(process.env.VITE_APPWRITE_PROJECT_ID)
    .setKey(process.env.VITE_APPWRITE_API_KEY);

  try {
    // **Check and Log Payload**
    console.log("🔍 Checking request payload...");
    if (!req || !req.payload) {
      console.error("❌ Request payload missing.");
      return res.json({ success: false, error: "Request payload missing." });
    }

    // **Attempt to Parse Payload**
    let payload;
    try {
      payload = JSON.parse(req.payload);
      console.log("✅ Parsed Payload:", payload);
    } catch (err) {
      console.error("❌ Invalid JSON format:", err.message);
      return res.json({ success: false, error: "Invalid JSON format." });
    }

    // **Check for Required Fields**
    if (!payload.email) {
      console.error("❌ Email field missing in payload.");
      return res.json({ success: false, error: "Email is required." });
    }
    const userEmail = payload.email;
    console.log("✅ Email Received:", userEmail);

    const homepageUrl = process.env.HOMEPAGE_URL || "https://grow-buddy.vercel.app";

    // **Launch Puppeteer for PDF Generation**
    console.log("🚀 Launching Puppeteer...");
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
    console.log("✅ PDF successfully generated.");

    // **Setup Nodemailer SMTP Connection**
    console.log("🔄 Setting up SMTP transporter...");
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
      console.log("🔄 Verifying SMTP connection...");
      await transporter.verify();
      console.log("✅ SMTP Connection Successful!");
    } catch (smtpError) {
      console.error("❌ SMTP Connection Failed:", smtpError.message);
      return res.json({ success: false, error: "SMTP connection failed: " + smtpError.message });
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
    console.log("✅ Welcome email sent successfully to:", userEmail);

    return res.json({ success: true, message: "Email sent successfully!" });

  } catch (error) {
    console.error("❌ Function Error:", error.message);
    return res.json({ success: false, error: error.message });
  }
};

