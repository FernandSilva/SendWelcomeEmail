const sdk = require("node-appwrite");
const nodemailer = require("nodemailer");

module.exports = async function (req, res, context) {
  const client = new sdk.Client();

  client
    .setEndpoint(process.env.VITE_APPWRITE_ENDPOINT)
    .setProject(process.env.VITE_APPWRITE_PROJECT_ID)
    .setKey(process.env.VITE_APPWRITE_API_KEY);

  context.log("✅ Function execution started.");

  // Validate request payload
  if (!req || !req.payload) {
    context.error("❌ Request payload missing.");
    return res.json({ success: false, error: "Request payload missing." });
  }

  let payload;
  try {
    payload = JSON.parse(req.payload);
    context.log("📩 Received payload:", payload);
  } catch (err) {
    context.error("❌ Invalid JSON format: " + err.message);
    return res.json({ success: false, error: "Invalid JSON payload." });
  }

  if (!payload.email) {
    context.error("❌ Email address missing.");
    return res.json({ success: false, error: "Email address missing in payload." });
  }

  const userEmail = payload.email;
  context.log("✅ Email to send:", userEmail);

  // SMTP Configuration
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
    // Verify SMTP Connection
    await transporter.verify();
    context.log("✅ SMTP Connection Successful!");

    // Send Email
    await transporter.sendMail({
      from: process.env.SMTP_USER,
      to: userEmail,
      subject: "Welcome to GrowBuddy!",
      text: "Thank you for signing up with GrowBuddy!",
    });

    context.log("✅ Email sent successfully to:", userEmail);
    return res.json({ success: true, message: "Email sent successfully!" });

  } catch (error) {
    context.error("❌ Email sending failed:", error.message);
    return res.json({ success: false, error: "Email sending failed: " + error.message });
  }
};
