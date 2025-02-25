const sdk = require("node-appwrite");
const nodemailer = require("nodemailer");
const chromium = require("@sparticuz/chromium");
const puppeteer = require("puppeteer-core");

module.exports = async function (req) {
  const client = new sdk.Client();

  client
    .setEndpoint(process.env.VITE_APPWRITE_ENDPOINT)
    .setProject(process.env.VITE_APPWRITE_PROJECT_ID)
    .setKey(process.env.VITE_APPWRITE_API_KEY);

  try {
    console.log("✅ Function execution started.");

    if (!req || !req.payload) {
      console.error("❌ Request payload missing.");
      return { success: false, error: "Request payload missing." };
    }

    let payload;
    try {
      payload = JSON.parse(req.payload);
    } catch (err) {
      console.error("❌ Invalid JSON format:", err.message);
      return { success: false, error: "Invalid JSON payload." };
    }

    if (!payload.email) {
      console.error("❌ User email missing in payload.");
      return { success: false, error: "User email missing." };
    }

    const userEmail = payload.email;
    const homepageUrl = process.env.HOMEPAGE_URL || "https://grow-buddy.vercel.app";

    console.log("🔄 Launching Puppeteer...");
    const browser = await puppeteer.launch({
      args: chromium.args,
      executablePath: await chromium.executablePath(),
      headless: chromium.headless,
    });

    const page = await browser.newPage();
    const htmlContent = `
      <html>
      <head><title>Welcome to GrowBuddy!</title></head>
      <body>
        <h1>Welcome to GrowBuddy!</h1>
        <p>Thank you for signing up. Visit us at <a href="${homepageUrl}">${homepageUrl}</a></p>
      </body>
      </html>`;

    await page.setContent(htmlContent, { waitUntil: "networkidle0" });
    const pdfBuffer = await page.pdf({ format: "A4" });
    await browser.close();
    console.log("✅ PDF generated.");

    const transporter = nodemailer.createTransport({
      host: process.env.SMTP_HOST,
      port: parseInt(process.env.SMTP_PORT, 10),
      secure: false,
      auth: {
        user: process.env.SMTP_USER,
        pass: process.env.SMTP_PASS,
      },
    });

    console.log("🔄 Verifying SMTP connection...");
    try {
      await transporter.verify();
      console.log("✅ SMTP Connection Successful!");
    } catch (smtpError) {
      console.error("❌ SMTP Connection Failed:", smtpError.message);
      return { success: false, error: "SMTP connection failed: " + smtpError.message };
    }

    const mailOptions = {
      from: process.env.SMTP_USER,
      to: userEmail,
      subject: "Welcome to GrowBuddy!",
      text: "Thanks for signing up! Check out the attached PDF for details.",
      attachments: [{ filename: "Welcome.pdf", content: pdfBuffer, contentType: "application/pdf" }],
    };

    await transporter.sendMail(mailOptions);
    console.log("✅ Email sent successfully to:", userEmail);

    return { success: true, message: "Email sent successfully!" };

  } catch (error) {
    console.error("❌ Error:", error.message);
    return { success: false, error: error.message };
  }
};
