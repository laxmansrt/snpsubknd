const nodemailer = require('nodemailer');

/**
 * Mock Notification Service
 * In a production app, you would use real credentials and a provider like SendGrid or Twilio.
 */

// Mock Email Transport (logs to console)
const sendEmail = async (to, subject, html) => {
    console.log(`[EMAIL SENT] To: ${to} | Subject: ${subject}`);
    console.log(`[CONTENT]: ${html}`);
    return true;
};

// SMS Transport via Fast2SMS API
const sendSMS = async (toPhoneNumber, text) => {
    try {
        const apiKey = '6y7AF5OLo1PfgB2QXkbR4suZCHcihazNwWMqvnDEeJrmGU0Ixl0p54iAdSgobMV8sBRzZaj1w27OnLqE'; // Fast2SMS API Key

        // Fast2SMS requires comma-separated numbers without the country code for bulk routing, but works fine with standard 10 digit Indian numbers
        const cleanNumber = toPhoneNumber.replace('+91', '').trim();

        const response = await fetch('https://www.fast2sms.com/dev/bulkV2', {
            method: 'POST',
            headers: {
                'authorization': apiKey,
                'Content-Type': 'application/json'
            },
            body: JSON.stringify({
                route: 'v3',
                sender_id: 'TXTIND', // Default Fast2SMS free sender ID
                message: text,
                language: 'english',
                flash: 0,
                numbers: cleanNumber
            })
        });

        const data = await response.json();
        console.log(`[SMS SENT VIA Fast2SMS] To: ${cleanNumber} | Response:`, data);

        if (data.return === false) {
            console.error("[Fast2SMS Error from API]:", data.message);
            return false;
        }

        return true;
    } catch (error) {
        console.error("[SMS SEND FAILED]:", error);
        return false;
    }
};

const notifyResults = async (student, resultsData) => {
    const subject = "Academic Results Published - Sapthagiri NPS University";
    const emailHtml = `
        <div style="font-family: sans-serif; padding: 20px; color: #1e293b;">
            <h2>Hello ${student.name},</h2>
            <p>Your examination results for <strong>${resultsData.semester}</strong> have been published.</p>
            <p>Please log in to your dashboard to view the detailed marksheet.</p>
            <br/>
            <a href="http://localhost:3000/dashboard/results" style="padding: 10px 20px; background: #d4af37; color: white; border-radius: 5px; text-decoration: none;">View Results</a>
            <p style="margin-top: 20px; font-size: 12px; color: #64748b;">This is an automated notification. Please do not reply.</p>
        </div>
    `;

    const smsText = `Respected Parent/Student, Results for ${resultsData.semester} are out. Check now at snpsu.edu.in. - SNPSU Office`;

    await sendEmail(student.email, subject, emailHtml);
    if (student.phone) await sendSMS(student.phone, smsText);
};

const sendExamLink = async (student, examTitle, examId) => {
    const examUrl = `http://localhost:3000/dashboard/exam/${examId}`;
    const subject = `Invigilator: ${examTitle} Access - SNPSU`;

    const emailHtml = `
        <div style="font-family: sans-serif; padding: 20px; color: #1e293b;">
            <h2>Dear ${student.name},</h2>
            <p>You have been invited to take the online exam: <strong>${examTitle}</strong>.</p>
            <p>Please click the link below to access the examination portal. Use your university credentials to log in.</p>
            <br/>
            <a href="${examUrl}" style="padding: 10px 20px; background: #1a2942; color: white; border-radius: 5px; text-decoration: none;">Start Exam</a>
            <p style="margin-top: 20px; font-size: 12px; color: #64748b;">Good luck with your exam!</p>
        </div>
    `;

    const smsText = `SNPSU Exam Alert: ${examTitle} is now active. Access here: ${examUrl}`;

    await sendEmail(student.email, subject, emailHtml);
    if (student.phone) await sendSMS(student.phone, smsText);
};

module.exports = {
    sendEmail,
    sendSMS,
    notifyResults,
    sendExamLink
};
