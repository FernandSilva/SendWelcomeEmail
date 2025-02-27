const sdk = require("node-appwrite");
const nodemailer = require("nodemailer");
const puppeteer = require("puppeteer");
const fs = require("fs");

module.exports = async function (req, context) {
  // Fallback logging functions
  const log = context && context.log ? context.log : console.log;
  const errorLog = context && context.error ? context.error : console.error;

  log("✅ Function execution started.");

  // If the incoming object has a nested 'req', use it.
  let requestData = req;
  if (req && req.req) {
    requestData = req.req;
  }

  // Debug: log the raw requestData and APPWRITE_FUNCTION_DATA.
  try {
    log("DEBUG: Raw requestData object: " + JSON.stringify(requestData));
  } catch (e) {
    log("DEBUG: Could not stringify requestData object");
  }
  log("DEBUG: APPWRITE_FUNCTION_DATA: " + process.env.APPWRITE_FUNCTION_DATA);

  // Initialize Appwrite client.
  const client = new sdk.Client();
  client
    .setEndpoint(process.env.VITE_APPWRITE_ENDPOINT)
    .setProject(process.env.VITE_APPWRITE_PROJECT_ID)
    .setKey(process.env.VITE_APPWRITE_API_KEY);

  let payload;
  if (requestData && requestData.bodyJson && Object.keys(requestData.bodyJson).length > 0) {
    payload = requestData.bodyJson;
    log("DEBUG: Payload from requestData.bodyJson: " + JSON.stringify(payload));
  } else if (requestData && requestData.body && Object.keys(requestData.body).length > 0) {
    if (typeof requestData.body === "string") {
      try {
        payload = JSON.parse(requestData.body);
        log("DEBUG: Payload from parsed requestData.body string: " + JSON.stringify(payload));
      } catch (e) {
        payload = requestData.body;
        log("DEBUG: requestData.body is a string but not valid JSON: " + payload);
      }
    } else {
      payload = requestData.body;
      log("DEBUG: Payload from requestData.body (object): " + JSON.stringify(payload));
    }
  } else if (process.env.APPWRITE_FUNCTION_DATA) {
    try {
      payload = JSON.parse(process.env.APPWRITE_FUNCTION_DATA);
      log("DEBUG: Payload from APPWRITE_FUNCTION_DATA: " + JSON.stringify(payload));
    } catch (e) {
      payload = process.env.APPWRITE_FUNCTION_DATA;
      log("DEBUG: APPWRITE_FUNCTION_DATA is not valid JSON: " + payload);
    }
  }

  if (!payload) {
    errorLog("❌ Request payload missing.");
    return { success: false, error: "Request payload missing." };
  }

  if (!payload.email) {
    errorLog("❌ Email field missing in payload.");
    return { success: false, error: "Email is required." };
  }
  const userEmail = payload.email;
  log("✅ Email Received: " + userEmail);

  const homepageUrl = process.env.HOMEPAGE_URL || "https://grow-buddy.vercel.app";

  log("🚀 Launching Puppeteer...");
  // Get the executable path from Chromium
  const execPath = await chromium.executablePath();
  log("DEBUG: Chromium executable path: " + execPath);
  
  // Check if the Chromium binary exists at the given path.
  if (!fs.existsSync(execPath)) {
    errorLog("❌ Chromium executable not found at " + execPath);
    return { success: false, error: "Chromium executable not found at " + execPath };
  }

  let browser;
  try {
    browser = await puppeteer.launch({
      args: chromium.args,
      executablePath: execPath,
      headless: chromium.headless,
    });
  } catch (launchError) {
    errorLog("❌ Failed to launch browser: " + launchError.message);
    return { success: false, error: "Failed to launch browser: " + launchError.message };
  }

  const page = await browser.newPage();

  const htmlContent = `
    <!DOCTYPE html>
    <html>
    <head>
      <meta charset="utf-8">
      <title>Welcome to GrowBuddy!</title>
      <style>
        body { font-family: Arial, sans-serif; padding: 20px; }
        h1 { color: #2E8B57; }
        p { font-size: 16px; }
      </style>
    </head>
    <body>
      <h1>Welcome to GrowBuddy!</h1>
      <p>Thank you for signing up. Visit us at <a href="${homepageUrl}">${homepageUrl}</a></p>
    </body>
    </html>`;

  await page.setContent(htmlContent, { waitUntil: "networkidle0" });
  const pdfBuffer = await page.pdf({ format: "A4" });
  await browser.close();
  log("✅ PDF successfully generated.");

  log("🔄 Setting up SMTP transporter...");
  const transporter = nodemailer.createTransport({
    host: process.env.SMTP_HOST,
    port: parseInt(process.env.SMTP_PORT, 10),
    secure: false, // Using TLS
    auth: {
      user: process.env.SMTP_USER,
      pass: process.env.SMTP_PASS,
    },
  });

  try {
    log("🔄 Verifying SMTP connection...");
    await transporter.verify();
    log("✅ SMTP Connection Successful!");
  } catch (smtpError) {
    errorLog("❌ SMTP Connection Failed: " + smtpError.message);
    return { success: false, error: "SMTP connection failed: " + smtpError.message };
  }

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
  log("✅ Welcome email sent successfully to: " + userEmail);

  const result = { success: true, message: "Email sent successfully!" };
  log(JSON.stringify(result));
  return result;
};
