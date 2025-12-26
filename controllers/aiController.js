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

const asyncHandler = require('express-async-handler');
const cacheUtil = require('../utils/cache');

/**
 * @desc    College AI Chat Assistant
 * @route   POST /api/ai/chat
 * @access  Public (Guest) / Private (Student, Faculty)
 */
const chatWithAI = asyncHandler(async (req, res) => {
    const { message, image, history = [], context } = req.body;
    const user = req.user;
    const userRole = user?.role || "guest";

    if (!openai) {
        res.status(500);
        throw new Error("AI service not configured. Contact administrator.");
    }

    if (!message && !image) {
        res.status(400);
        throw new Error("Valid message or image is required");
    }

    /* ----------------------------------------------------
       1. HARD SECURITY: Block Private Queries for Guests
    ---------------------------------------------------- */
    const restrictedKeywords = [
        "usn", "attendance", "marks", "internal", "salary",
        "phone", "email", "employee id", "student details", "faculty details"
    ];

    if (userRole === "guest" && message && restrictedKeywords.some(k => message.toLowerCase().includes(k))) {
        return res.json({
            reply: "Sorry, that information is private and not accessible to the public. Please log in to access your personal academic data."
        });
    }

    /* ----------------------------------------------------
       2. Fetch Context with Caching
    ---------------------------------------------------- */
    let portalContext = context;

    if (!portalContext) {
        const cacheKey = `announcements_${userRole}`;

        portalContext = await cacheUtil.getOrSet(cacheKey, async () => {
            const query = { isActive: true };
            if (userRole === "guest") {
                query.targetAudience = "all";
            } else {
                query.targetAudience = { $in: [userRole, "all"] };
            }

            const announcements = await Announcement.find(query)
                .sort({ publishedAt: -1 })
                .limit(5)
                .select("title content category -_id")
                .lean();

            return announcements
                .map(a => `Title: ${a.title}\nCategory: ${a.category}\nContent: ${a.content.substring(0, 200)}`)
                .join("\n\n");
        }, 600);
    }

    /* ----------------------------------------------------
       3. Role-Based AI Access Rules
    ---------------------------------------------------- */
    const accessRules = userRole === "guest"
        ? `PUBLIC VISITOR. Rules: Only public info. NEVER reveal personal data. Refuse restricted questions.`
        : `AUTHENTICATED ${userRole.toUpperCase()}. Rules: Role-based permissions only. Student Info: USN ${user.studentData?.usn || 'N/A'}, Dept ${user.studentData?.department || 'N/A'}`;

    /* ----------------------------------------------------
       4. Prepare Messages for AI
    ---------------------------------------------------- */
    const userContent = [];
    if (message) userContent.push({ type: "text", text: message });
    if (image) userContent.push({ type: "image_url", image_url: { url: image } });

    const messages = [
        { role: "system", content: collegeAIPrompt },
        { role: "system", content: accessRules },
        { role: "system", content: `College Portal Context:\n${portalContext || "No context available."}` },
        ...(Array.isArray(history) ? history.map(h => ({
            role: h.role === "user" ? "user" : "assistant",
            content: h?.parts?.[0]?.text || (typeof h.content === "string" ? h.content : "")
        })).filter(m => m.content).slice(-6) : []),
        { role: "user", content: userContent }
    ];

    /* ----------------------------------------------------
       5. Generate AI Response with Timeout
    ---------------------------------------------------- */
    try {
        const timeoutPromise = new Promise((_, reject) =>
            setTimeout(() => reject(new Error('AI_TIMEOUT')), 25000) // Vision tasks might take longer
        );

        const completionPromise = openai.chat.completions.create({
            model: "gpt-4o-mini",
            messages: messages,
            max_tokens: 600,
            temperature: 0.7,
        });

        const completion = await Promise.race([completionPromise, timeoutPromise]);

        const reply = completion.choices[0]?.message?.content;
        if (!reply) throw new Error("EMPTY_RESPONSE");

        res.json({ reply });

    } catch (error) {
        console.error(`[AI vision Error] ${error.message}`);
        let fallbackReply = "I'm sorry, I'm having trouble analyzing that request right now. Please try again.";

        if (error.message === 'AI_TIMEOUT') {
            fallbackReply = "The analysis took too long. Please try with a smaller image or shorter question.";
        } else if (error.message.includes('rate_limit')) {
            fallbackReply = "I'm receiving too many visual requests right now. Please wait a minute.";
        }

        res.json({
            reply: fallbackReply,
            isFallback: true
        });
    }
});

module.exports = { chatWithAI };
