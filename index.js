const sdk = require("node-appwrite");
const nodemailer = require("nodemailer");

module.exports = async function (req, context) {
  // Use context.log/error if available; otherwise fallback to console.log/error.
  const log = (context && context.log) || console.log;
  const errorLog = (context && context.error) || console.error;

  log("✅ Function execution started.");

  // Normalize the request object: if req contains a nested 'req', use that.
  let requestData = req;
  if (req && req.req) {
    requestData = req.req;
  }

  // Debug logging for raw request data and APPWRITE_FUNCTION_DATA.
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

  // Extract payload from various sources.
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

  // Use a homepage URL from environment variable or fallback.
  const homepageUrl = process.env.HOMEPAGE_URL || "https://grow-buddy.vercel.app";

  // Updated HTML email content with the new text and no image above the heading.
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
          h1 {
            color: #2E8B57;
            font-size: 28px;
            margin-bottom: 20px;
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
            display: inline-block;
            padding: 12px 20px;
            background-color: #2E8B57;
            color: #fff;
            text-decoration: none;
            border-radius: 5px;
            font-weight: bold;
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
          <h1>Welcome to GrowBuddy! 🌿</h1>
          <p>We're excited to have you here! GrowBuddy is a private cannabis community built for growers, enthusiasts, and like-minded individuals who respect each other's privacy and passion for the plant.</p>
          <p><span class="highlight">🔒 Privacy First</span> – We value your anonymity. We recommend using a username rather than personal details to keep your experience secure and chill.</p>
          <p><span class="highlight">🤝 Respect the Vibes</span> – This is a friendly space. Treat others with kindness, share knowledge, and keep the community positive. No hate, no drama—just good vibes.</p>
          <p><span class="highlight">🌱 Grow Together</span> – Whether you’re a beginner or a seasoned pro, this space is for learning, sharing, and thriving in the grow game.</p>
          <p><span class="highlight">🚨 For Transparency</span> – GrowBuddy is a private cannabis club that operates within legal limits. We appreciate honesty from all members and expect everyone to engage in good faith. If you're here on business, we’d appreciate it if you were up front.</p>
          <p><span class="highlight">Installation Guide</span><br>
             Want quick access to GrowBuddy? No need for app stores—just add it to your home screen!<br>
             <strong>On iPhone (Safari):</strong> Tap the share icon, then select "Add to Home Screen."<br>
             <strong>On Android (Chrome):</strong> Tap the menu (three dots), then choose "Add to Home Screen."<br>
             This creates an icon on your device, making GrowBuddy feel just like a native app—one tap, and you're in! 🌿🚀
          </p>
          <p style="text-align: center;">
            <a class="button" href="${homepageUrl}">Join GrowBuddy</a>
          </p>
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
    html: emailHtmlContent,
  };

  await transporter.sendMail(mailOptions);
  log("✅ Welcome email sent successfully to: " + userEmail);

  const result = { success: true, message: "Email sent successfully!" };
  log(JSON.stringify(result));
  return result;
};
