const sdk = require("node-appwrite");
const nodemailer = require("nodemailer");
const chromium = require("@sparticuz/chromium");
const puppeteer = require("puppeteer-core");

module.exports = async function (req) {
    const client = new sdk.Client();
    const users = new sdk.Users(client);
    
    client
        .setEndpoint(process.env.APPWRITE_ENDPOINT)
        .setProject(process.env.APPWRITE_PROJECT_ID)
        .setKey(process.env.APPWRITE_API_KEY);
    
    try {
        // Ensure req.payload exists before parsing
        if (!req || !req.payload) {
            throw new Error("Request payload is missing.");
        }

        const payload = JSON.parse(req.payload);
        if (!payload.email) {
            throw new Error("User email is missing in payload.");
        }

        const userEmail = payload.email;

        // Generate PDF using Puppeteer optimized for Appwrite
        const browser = await puppeteer.launch({
            args: chromium.args,
            executablePath: await chromium.executablePath(),
            headless: chromium.headless
        });

        const page = await browser.newPage();
        
        const htmlContent = `
            <html>
                <head><title>Welcome</title></head>
                <body>
                    <h1>Welcome to GrowBuddy!</h1>
                    <p>Thank you for signing up. Click the link below to visit our homepage:</p>
                    <a href="${process.env.HOMEPAGE_URL}">Go to Homepage</a>
                </body>
            </html>`;
        
        await page.setContent(htmlContent);
        const pdfBuffer = await page.pdf();
        await browser.close();

        // Set up Nodemailer for email sending
        const transporter = nodemailer.createTransport({
            host: process.env.SMTP_HOST,
            port: process.env.SMTP_PORT,
            secure: false,
            auth: {
                user: process.env.SMTP_USER,
                pass: process.env.SMTP_PASS
            }
        });

        // Email options
        const mailOptions = {
            from: process.env.SMTP_USER,
            to: userEmail,
            subject: "Welcome to GrowBuddy!",
            text: "Thank you for signing up. Please find the attached PDF with more details.",
            attachments: [{
                filename: "Welcome.pdf",
                content: pdfBuffer
            }]
        };

        // Send email
        await transporter.sendMail(mailOptions);

        return JSON.stringify({ success: true, message: "Email sent successfully!" });

    } catch (error) {
        console.error("Error:", error.stack);
        return JSON.stringify({ success: false, error: error.message });
    }
};

