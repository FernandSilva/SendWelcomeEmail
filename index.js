const sdk = require("node-appwrite");
const nodemailer = require("nodemailer");

module.exports = async function (req, context) {
  const log = (context && context.log) || console.log;
  const errorLog = (context && context.error) || console.error;

  log("✅ Function execution started.");

  let requestData = req;
  if (req && req.req) requestData = req.req;

  try {
    log("DEBUG: Raw requestData object: " + JSON.stringify(requestData));
  } catch (e) {
    log("DEBUG: Could not stringify requestData object");
  }

  log("DEBUG: APPWRITE_FUNCTION_DATA: " + process.env.APPWRITE_FUNCTION_DATA);

  const client = new sdk.Client();
  client
    .setEndpoint(process.env.VITE_APPWRITE_ENDPOINT)
    .setProject(process.env.VITE_APPWRITE_PROJECT_ID)
    .setKey(process.env.VITE_APPWRITE_API_KEY);

  let payload;
  if (requestData && requestData.bodyJson && Object.keys(requestData.bodyJson).length > 0) {
    payload = requestData.bodyJson;
  } else if (requestData && requestData.body && Object.keys(requestData.body).length > 0) {
    if (typeof requestData.body === "string") {
      try {
        payload = JSON.parse(requestData.body);
      } catch (e) {
        payload = requestData.body;
      }
    } else {
      payload = requestData.body;
    }
  } else if (process.env.APPWRITE_FUNCTION_DATA) {
    try {
      payload = JSON.parse(process.env.APPWRITE_FUNCTION_DATA);
    } catch (e) {
      payload = process.env.APPWRITE_FUNCTION_DATA;
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

  const homepageUrl = process.env.HOMEPAGE_URL || "https://www.growbuddy.club";

  const emailHtmlContent = `
<!DOCTYPE html>
<html>
  <head>
    <meta charset="utf-8">
    <title>Welcome to GrowBuddy!</title>
    <style>
      body {
        font-family: Arial, sans-serif;
        padding: 20px;
        background-color: #f8f8f8;
        color: #333;
      }
      .container {
        max-width: 600px;
        margin: 0 auto;
        background: #fff;
        padding: 30px;
        border-radius: 8px;
        box-shadow: 0 2px 4px rgba(0,0,0,0.1);
      }
      .logo {
        display: block;
        margin: 0 auto 20px auto;
        max-width: 120px;
      }
      h1 {
        color: #2E8B57;
        font-size: 28px;
        margin-bottom: 20px;
        text-align: center;
      }
      p {
        font-size: 16px;
        line-height: 1.5;
        margin-bottom: 20px;
      }
      .highlight {
        font-weight: bold;
      }
      .button {
        display: block;
        width: fit-content;
        margin: 0 auto;
        padding: 12px 20px;
        background-color: #2E8B57;
        color: #fff;
        text-decoration: none;
        border-radius: 5px;
        font-weight: bold;
      }
      .disclaimer {
        font-size: 14px;
        color: #555;
        text-align: center;
        margin-top: 20px;
        margin-bottom: 20px;
      }
      .footer {
        text-align: center;
        font-size: 14px;
        color: #777;
        margin-top: 30px;
      }
    </style>
  </head>
  <body>
    <div class="container">
      <img src="https://www.growbuddy.club/logo.jpeg" alt="GrowBuddy Logo" class="logo">
      <h1>Welcome to GrowBuddy! 🌿</h1>

      <p>We're excited to have you here! GrowBuddy is a private cannabis community built for growers, enthusiasts, and like-minded individuals who respect each other's privacy and passion for the plant.</p>

      <p><span class="highlight">🔒 Privacy First</span> – We value your anonymity. We recommend using a username rather than personal details to keep your experience secure and chill. There are no ads, no tracking, and no data harvesting. GrowBuddy is a free and private social club—not a data-mining platform. Your data is periodically wiped and never sold to third parties.</p>

      <p><span class="highlight">🤝 Respect the Vibes</span> – This is a friendly space. Treat others with kindness, share knowledge, and keep the community positive. No hate, no drama—just good vibes. Users who violate these principles may be removed along with their data.</p>

      <p><span class="highlight">🚨 Transparency</span> – GrowBuddy is a private club. If you're here for official or commercial reasons, please be upfront. We reserve the right to remove any user who is not aligned with our mission and community standards.</p>

      <p><span class="highlight">🌱 Grow Together</span> – Whether you’re a beginner or a seasoned pro, this space is for learning, sharing, and thriving in the grow game. GrowBuddy is on the hunt for the world’s best growers—to share knowledge, inspire others, and elevate the community together.</p>

      <p><span class="highlight">Installation Guide</span><br>
         Want quick access to GrowBuddy? No need for app stores—just add it to your home screen!<br>
         <strong>On iPhone (Safari):</strong> Tap the share icon, then select "Add to Home Screen."<br>
         <strong>On Android (Chrome):</strong> Tap the menu (three dots), then choose "Add to Home Screen."<br>
         This creates an icon on your device, making GrowBuddy feel just like a native app—one tap, and you're in! 🌿🚀
      </p>

      <p class="disclaimer">
        By clicking the link below, you confirm that you accept GrowBuddy's terms and conditions mentioned above and in the application.
      </p>

      <a class="button" href="${homepageUrl}/signup">Join GrowBuddy</a>

      <div class="footer">
        <p>GrowBuddy • A community built for growers</p>
      </div>
    </div>
  </body>
</html>
  `;

  log("🔄 Setting up SMTP transporter...");
  const transporter = nodemailer.createTransport({
    host: process.env.SMTP_HOST,
    port: parseInt(process.env.SMTP_PORT, 10),
    secure: false,
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
    html: emailHtmlContent,
  };

  await transporter.sendMail(mailOptions);
  log("✅ Welcome email sent successfully to: " + userEmail);

  return { success: true, message: "Email sent successfully!" };
};
