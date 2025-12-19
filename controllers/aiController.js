const OpenAI = require("openai");
const collegeAIPrompt = require("../prompts/collegeAIPrompt");
const Announcement = require("../models/Announcement");

// Initialize OpenAI
const openai = new OpenAI({
    apiKey: process.env.OPENAI_API_KEY,
});

/**
 * @desc    Chat with AI Assistant
 * @route   POST /api/ai/chat
 * @access  Private
 */
const chatWithAI = async (req, res) => {
    try {
        const { message, history, context } = req.body;
        const user = req.user;

        if (!message) {
            return res.status(400).json({ message: "Message is required" });
        }

        // 1. Fetch Context if not provided
        let portalContext = context;
        if (!portalContext) {
            const announcements = await Announcement.find({
                isActive: true,
                targetAudience: { $in: [user.role, 'all'] }
            }).sort({ publishedAt: -1 }).limit(5);

            portalContext = announcements.map(a =>
                `Title: ${a.title}, Content: ${a.content}, Category: ${a.category}`
            ).join("\n");
        }

        // 2. Prepare Messages for OpenAI
        const messages = [
            { role: "system", content: collegeAIPrompt },
            {
                role: "system",
                content: `User Role: ${user.role}. 
                ${user.role === 'student' ? `Student Info: USN ${user.studentData?.usn}, Class ${user.studentData?.class}, Dept ${user.studentData?.department}` : ''}
                ${user.role === 'faculty' ? `Faculty Info: ID ${user.facultyData?.employeeId}, Dept ${user.facultyData?.department}` : ''}`
            },
            {
                role: "system",
                content: `Context from portal data:\n${portalContext || "No additional context provided."}`
            },
            ...history.map(h => ({
                role: h.role === 'user' ? 'user' : 'assistant',
                content: h.parts[0].text
            })),
            { role: "user", content: message }
        ];

        // 3. Generate Completion using OpenAI
        const completion = await openai.chat.completions.create({
            model: "gpt-4o-mini",
            messages: messages,
            max_tokens: 500,
        });

        const reply = completion.choices[0].message.content;

        res.json({ reply });
    } catch (error) {
        console.error("AI Chat Error:", error);
        res.status(500).json({ message: "AI Assistant is currently unavailable. Please try again later." });
    }
};

module.exports = { chatWithAI };
