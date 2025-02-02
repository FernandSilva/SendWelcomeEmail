// index.js
const sdk = require("node-appwrite");
const nodemailer = require("nodemailer");
const chromium = require("@sparticuz/chromium");
const puppeteer = require("puppeteer-core");

module.exports = async function (req) {
  // Initialize Appwrite Client
  const client = new sdk.Client();
  const users = new sdk.Users(client);

  client
    .setEndpoint(process.env.APPWRITE_ENDPOINT)
    .setProject(process.env.APPWRITE_PROJECT_ID)
    .setKey(process.env.APPWRITE_API_KEY);

  try {
    // Validate and parse the request payload
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

    // Generate PDF using Puppeteer with a professional green-themed HTML template
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
            .header h1 {
              margin: 0;
              font-size: 28px;
              font-weight: 700;
            }
            .content {
              padding: 30px;
              text-align: center;
            }
            .content p {
              font-size: 16px;
              color: #333333;
              line-height: 1.5;
              margin: 20px 0;
            }
            .button {
              display: inline-block;
              padding: 12px 24px;
              font-size: 16px;
              color: #ffffff;
              background-color: #28a745;
              text-decoration: none;
              border-radius: 4px;
              transition: background-color 0.3s ease;
            }
            .button:hover {
              background-color: #218838;
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
              <p>Thank you for signing up with GrowBuddy. We're excited to have you on board!</p>
              <p>Explore our platform and discover tools to help you grow your ideas.</p>
              <p>To get started, click the button below to visit our homepage:</p>
              <a class="button" href="${homepageUrl}" target="_blank">Visit GrowBuddy</a>
            </div>
            <div class="footer">
              &copy; ${new Date().getFullYear()} GrowBuddy. All rights reserved.
            </div>
          </div>
        </body>
      </html>
    `;

    await page.setContent(htmlContent, { waitUntil: "networkidle0" });
    const pdfBuffer = await page.pdf({ format: "A4" });
    await browser.close();
    console.log("PDF generated successfully.");

    // Configure Nodemailer transport
    const transporter = nodemailer.createTransport({
      host: process.env.SMTP_HOST,
      port: parseInt(process.env.SMTP_PORT, 10),
      secure: false, // TLS is used when secure is false and port is 587
      auth: {
        user: process.env.SMTP_USER,
        pass: process.env.SMTP_PASS,
      },
    });

    // Email options including the PDF attachment
    const mailOptions = {
      from: process.env.SMTP_USER,
      to: userEmail,
      subject: "Welcome to GrowBuddy!",
      text: "Thank you for signing up. Please find the attached PDF with more details.",
      attachments: [
        {
          filename: "Welcome.pdf",
          content: pdfBuffer,
          contentType: "application/pdf",
        },
      ],
    };

    // Send the email
    await transporter.sendMail(mailOptions);
    console.log("Welcome email sent successfully to:", userEmail);

    return { success: true, message: "Email sent successfully!" };
  } catch (error) {
    console.error("Error:", error.stack);
    return { success: false, error: error.message };
  }
};
