const { GoogleGenerativeAI } = require("@google/generative-ai");
const collegeAIPrompt = require("../prompts/collegeAIPrompt");
const Announcement = require("../models/Announcement");

// Initialize Gemini AI
const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY);

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

        // 2. Generate Content using Gemini
        const model = genAI.getGenerativeModel({ model: "gemini-1.5-flash" });

        const chat = model.startChat({
            history: history || [],
            generationConfig: {
                maxOutputTokens: 500,
            },
        });

        const fullPrompt = `
${collegeAIPrompt}

User Role: ${user.role}
${user.role === 'student' ? `Student Info: USN ${user.studentData?.usn}, Class ${user.studentData?.class}` : ''}

Context from portal data:
${portalContext || "No additional context provided."}

User Message: ${message}
`;

        const result = await chat.sendMessage(fullPrompt);
        const response = await result.response;
        const text = response.text();

        res.json({ reply: text });
    } catch (error) {
        console.error("AI Chat Error:", error);
        res.status(500).json({ message: "AI Assistant is currently unavailable. Please try again later." });
    }
};

module.exports = { chatWithAI };
