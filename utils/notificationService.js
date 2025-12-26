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

// Mock SMS Transport (logs to console)
const sendSMS = async (to, text) => {
    console.log(`[SMS SENT] To: ${to} | Message: ${text}`);
    return true;
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
