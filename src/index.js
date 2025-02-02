const sdk = require("node-appwrite");
const nodemailer = require("nodemailer");
const puppeteer = require("puppeteer");

module.exports = async function (req, res) {
    const client = new sdk.Client();
    const users = new sdk.Users(client);
    
    client
        .setEndpoint(process.env.APPWRITE_ENDPOINT)
        .setProject(process.env.APPWRITE_PROJECT_ID)
        .setKey(process.env.APPWRITE_API_KEY);
    
    try {
        const payload = JSON.parse(req.payload);
        const userId = payload.$id;
        const userEmail = payload.email;

        // Generate PDF using Puppeteer
        const browser = await puppeteer.launch();
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

        return res.json({ success: true, message: "Email sent successfully!" });

    } catch (error) {
        console.error("Error:", error);
        return res.json({ success: false, error: error.message });
    }
};
