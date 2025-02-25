const sdk = require("node-appwrite");
const nodemailer = require("nodemailer");
const chromium = require("@sparticuz/chromium");
const puppeteer = require("puppeteer-core");

module.exports = async function (req, res, context) {
  context.log("📌 Function execution started");

  const client = new sdk.Client();
  client
    .setEndpoint(process.env.VITE_APPWRITE_ENDPOINT)
    .setProject(process.env.VITE_APPWRITE_PROJECT_ID)
    .setKey(process.env.VITE_APPWRITE_API_KEY);

  try {
    // Handle both GET & POST Requests
    if (!req || !req.payload) {
      context.error("❌ Request payload missing.");
      return res.json({ success: false, error: "Request payload missing." });
    }

    let payload;
    try {
      payload = JSON.parse(req.payload);
    } catch (err) {
      context.error("❌ Invalid JSON format: " + err.message);
      return res.json({ success: false, error: "Invalid JSON format in payload." });
    }

    if (!payload.email) {
      context.error("❌ User email is missing.");
      return res.json({ success: false, error: "User email missing in payload." });
    }

    const userEmail = payload.email;
    const homepageUrl = process.env.HOMEPAGE_URL || "https://grow-buddy.vercel.app";

    context.log("📌 Launching Puppeteer...");

    const browser = await puppeteer.launch({
      args: chromium.args,
      executablePath: await chromium.executablePath(),
      headless: chromium.headless,
    });

    const page = await browser.newPage();
    await page.setContent(
      `<html><head><title>Welcome to GrowBuddy</title></head>
      <body><h1>Welcome to GrowBuddy!</h1>
      <p>Thanks for signing up! <a href="${homepageUrl}">Visit GrowBuddy</a></p></body></html>`,
      { waitUntil: "networkidle0" }
    );

    await page.waitForTimeout(3000); // Ensure content fully loads
    const pdfBuffer = await page.pdf({ format: "A4" });
    await browser.close();

    context.log("✅ PDF generated successfully.");

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

    // Verify SMTP Connection
    try {
      await transporter.verify();
      context.log("✅ SMTP connection successful!");
    } catch (smtpError) {
      context.error("❌ SMTP connection error:", smtpError.message);
      return res.json({ success: false, error: "SMTP connection failed: " + smtpError.message });
    }

    // Send Email
    const mailOptions = {
      from: process.env.SMTP_USER,
      to: userEmail,
      subject: "Welcome to GrowBuddy!",
      text: "Thank you for signing up. Please see the attached PDF for details.",
      attachments: [{ filename: "Welcome.pdf", content: pdfBuffer }],
    };

    await transporter.sendMail(mailOptions);
    context.log(`✅ Welcome email sent successfully to: ${userEmail}`);

    return res.json({ success: true, message: "Email sent successfully!" });

  } catch (error) {
    context.error("❌ Error:", error.stack);
    return res.json({ success: false, error: error.message });
  }
};


