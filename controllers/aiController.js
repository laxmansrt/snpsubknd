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
        const { message, history = [], context } = req.body;
        const user = req.user; // undefined for landing page users
        const userRole = user?.role || "guest";

        if (!openai) {
            return res.status(500).json({
                message: "AI service not configured. Contact administrator.",
            });
        }

        if (!message || typeof message !== "string") {
            return res.status(400).json({ message: "Valid message is required" });
        }

        /* ----------------------------------------------------
           1. HARD SECURITY: Block Private Queries for Guests
        ---------------------------------------------------- */
        const restrictedKeywords = [
            "usn",
            "attendance",
            "marks",
            "internal",
            "salary",
            "phone",
            "email",
            "employee id",
            "student details",
            "faculty details",
        ];

        if (
            userRole === "guest" &&
            restrictedKeywords.some(k => message.toLowerCase().includes(k))
        ) {
            return res.json({
                reply:
                    "Sorry, that information is private and not accessible to the public. Please log in to access your personal academic data.",
            });
        }

        /* ----------------------------------------------------
           2. Fetch Context (Public vs Role-Based)
        ---------------------------------------------------- */
        let portalContext = context;

        if (!portalContext) {
            try {
                const query = { isActive: true };

                if (userRole === "guest") {
                    // Map 'guest' to 'all' for public announcements
                    query.targetAudience = "all";
                } else {
                    query.targetAudience = { $in: [userRole, "all"] };
                }

                const announcements = await Announcement.find(query)
                    .sort({ publishedAt: -1 })
                    .limit(5)
                    .select("title content category");

                portalContext = announcements
                    .map(a =>
                        `Title: ${a.title}\nCategory: ${a.category}\nContent: ${a.content.substring(0, 300)}`
                    )
                    .join("\n\n");
            } catch (error) {
                console.error("Context fetch error:", error);
                portalContext = "No portal context available.";
            }
        }

        /* ----------------------------------------------------
           3. Role-Based AI Access Rules
        ---------------------------------------------------- */
        let accessRules = "";

        if (userRole === "guest") {
            accessRules = `
This is a PUBLIC VISITOR.
Rules:
- Answer using ONLY public college information.
- NEVER reveal student, faculty, or admin data.
- Politely refuse restricted questions about personal data.
`;
        } else {
            accessRules = `
This is an AUTHENTICATED ${userRole.toUpperCase()}.
Rules:
- Answer only within role-based permissions.
- Do not reveal data of other users.
- Student Info: USN ${user.studentData?.usn || 'N/A'}, Class ${user.studentData?.class || 'N/A'}, Dept ${user.studentData?.department || 'N/A'}
`;
        }

        /* ----------------------------------------------------
           4. Prepare Messages for AI
        ---------------------------------------------------- */
        const messages = [
            { role: "system", content: collegeAIPrompt },
            { role: "system", content: accessRules },
            {
                role: "system",
                content: `College Portal Context:\n${portalContext || "No additional context provided."}`,
            },
            ...(Array.isArray(history)
                ? history.map(h => ({
                    role: h.role === "user" ? "user" : "assistant",
                    content:
                        h?.parts?.[0]?.text ||
                        (typeof h.content === "string" ? h.content : ""),
                })).filter(m => m.content)
                : []),
            { role: "user", content: message },
        ];

        /* ----------------------------------------------------
           5. Generate AI Response
        ---------------------------------------------------- */
        const completion = await openai.chat.completions.create({
            model: "gpt-4o-mini",
            messages: messages,
            max_tokens: 500,
        });

        if (!completion.choices || completion.choices.length === 0) {
            throw new Error("No response from OpenAI");
        }

        const reply = completion.choices[0].message.content;

        return res.json({ reply });

    } catch (error) {
        console.error("AI Chat Error:", error);
        return res.status(500).json({
            message: "AI Assistant is temporarily unavailable.",
            error:
                process.env.NODE_ENV === "development"
                    ? error.message
                    : undefined,
        });
    }
};

module.exports = { chatWithAI };
