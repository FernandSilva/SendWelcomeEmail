const sdk = require("node-appwrite");
const nodemailer = require("nodemailer");

module.exports = async function (req) {
  const client = new sdk.Client();

  client
    .setEndpoint(process.env.VITE_APPWRITE_ENDPOINT)
    .setProject(process.env.VITE_APPWRITE_PROJECT_ID)
    .setKey(process.env.VITE_APPWRITE_API_KEY);

  console.log("✅ Function execution started.");

  // **Fix #1: Validate request payload correctly**
  if (!req || !req.payload) {
    console.error("❌ Request payload missing.");
    return { success: false, error: "Request payload missing." };
  }

  let payload;
  try {
    payload = JSON.parse(req.payload);
    console.log("📩 Received payload:", payload);
  } catch (err) {
    console.error("❌ Invalid JSON format:", err.message);
    return { success: false, error: "Invalid JSON payload." };
  }

  if (!payload.email) {
    console.error("❌ Email address missing.");
    return { success: false, error: "Email address missing in payload." };
  }

  const userEmail = payload.email;
  console.log("✅ Email to send:", userEmail);

  // **Fix #2: SMTP Configuration**
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
    console.log("✅ SMTP Connection Successful!");

    // Send Email
    await transporter.sendMail({
      from: process.env.SMTP_USER,
      to: userEmail,
      subject: "Welcome to GrowBuddy!",
      text: "Thank you for signing up with GrowBuddy!",
    });

    console.log("✅ Email sent successfully to:", userEmail);
    return { success: true, message: "Email sent successfully!" };

  } catch (error) {
    console.error("❌ Email sending failed:", error.message);
    return { success: false, error: "Email sending failed: " + error.message };
  }
};

