const OpenAI = require("openai");
const collegeAIPrompt = require("../prompts/collegeAIPrompt");
const Announcement = require("../models/Announcement");

// Initialize OpenAI
let openai;
try {
    if (process.env.OPENAI_API_KEY) {
        openai = new OpenAI({
            apiKey: process.env.OPENAI_API_KEY,
        });
    }
} catch (error) {
    console.error("Failed to initialize OpenAI client:", error);
}

/**
 * @desc    Chat with AI Assistant
 * @route   POST /api/ai/chat
 * @access  Private
 */
const chatWithAI = async (req, res) => {
    try {
        const { message, history, context } = req.body;
        const user = req.user;

        if (!user) {
            return res.status(401).json({ message: "User not authenticated" });
        }

        if (!openai) {
            console.error("OpenAI client not initialized. Check OPENAI_API_KEY.");
            return res.status(500).json({ message: "AI Assistant is currently misconfigured. Please contact admin." });
        }

        if (!message) {
            return res.status(400).json({ message: "Message is required" });
        }

        // 1. Fetch Context if not provided
        let portalContext = context;
        if (!portalContext) {
            try {
                const announcements = await Announcement.find({
                    isActive: true,
                    targetAudience: { $in: [user.role, 'all'] }
                }).sort({ publishedAt: -1 }).limit(5);

                portalContext = announcements.map(a =>
                    `Title: ${a.title}, Content: ${a.content}, Category: ${a.category}`
                ).join("\n");
            } catch (ctxError) {
                console.error("Error fetching portal context:", ctxError);
                portalContext = "Error fetching portal context.";
            }
        }

        // 2. Prepare Messages for OpenAI
        const safeHistory = Array.isArray(history) ? history : [];
        const messages = [
            { role: "system", content: collegeAIPrompt },
            {
                role: "system",
                content: `User Role: ${user.role}. 
                ${user.role === 'student' ? `Student Info: USN ${user.studentData?.usn || 'N/A'}, Class ${user.studentData?.class || 'N/A'}, Dept ${user.studentData?.department || 'N/A'}` : ''}
                ${user.role === 'faculty' ? `Faculty Info: ID ${user.facultyData?.employeeId || 'N/A'}, Dept ${user.facultyData?.department || 'N/A'}` : ''}`
            },
            {
                role: "system",
                content: `Context from portal data:\n${portalContext || "No additional context provided."}`
            },
            ...safeHistory.map(h => ({
                role: h.role === 'user' ? 'user' : 'assistant',
                content: (h.parts && h.parts[0] && h.parts[0].text) || (typeof h.content === 'string' ? h.content : "")
            })).filter(m => m.content),
            { role: "user", content: message }
        ];

        // 3. Generate Completion using OpenAI
        const completion = await openai.chat.completions.create({
            model: "gpt-4o-mini",
            messages: messages,
            max_tokens: 500,
        });

        if (!completion.choices || completion.choices.length === 0) {
            throw new Error("No response from OpenAI");
        }

        const reply = completion.choices[0].message.content;

        res.json({ reply });
    } catch (error) {
        console.error("AI Chat Error:", error);
        res.status(500).json({
            message: "AI Assistant is currently unavailable. Please try again later.",
            error: process.env.NODE_ENV === 'development' ? error.message : undefined
        });
    }
};

module.exports = { chatWithAI };
