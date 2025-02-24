const sdk = require("node-appwrite");
const nodemailer = require("nodemailer");

module.exports = async function (req) {
  const client = new sdk.Client();

  client
    .setEndpoint(process.env.VITE_APPWRITE_ENDPOINT)
    .setProject(process.env.VITE_APPWRITE_PROJECT_ID)
    .setKey(process.env.VITE_APPWRITE_API_KEY);

  if (!req || !req.payload) {
    return { success: false, error: "Request payload is missing." };
  }

  let payload;
  try {
    payload = JSON.parse(req.payload);
  } catch {
    return { success: false, error: "Invalid JSON format in payload." };
  }

  const userEmail = payload.email;
  if (!userEmail) {
    return { success: false, error: "User email is missing." };
  }

  const transporter = nodemailer.createTransport({
    host: process.env.SMTP_HOST,
    port: parseInt(process.env.SMTP_PORT, 10) || 587,
    secure: false,
    auth: {
      user: process.env.SMTP_USER,
      pass: process.env.SMTP_PASS,
    },
  });

  const mailOptions = {
    from: process.env.SMTP_USER,
    to: userEmail,
    subject: "Welcome to GrowBuddy!",
    html: `<h1>Welcome to GrowBuddy!</h1>
           <p>Thank you for signing up. Visit our website <a href="${process.env.HOMEPAGE_URL}">here</a>.</p>`,
  };

  try {
    await transporter.sendMail(mailOptions);
    return { success: true, message: "Simplified email sent successfully!" };
  } catch (error) {
    console.error("Email sending failed:", error.message);
    return { success: false, error: error.message };
  }
};
