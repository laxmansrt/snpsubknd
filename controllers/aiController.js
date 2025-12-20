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
    const { message, history = [], context } = req.body;
    const user = req.user;
    const userRole = user?.role || "guest";

    if (!openai) {
        res.status(500);
        throw new Error("AI service not configured. Contact administrator.");
    }

    if (!message || typeof message !== "string") {
        res.status(400);
        throw new Error("Valid message is required");
    }

    /* ----------------------------------------------------
       1. HARD SECURITY: Block Private Queries for Guests
    ---------------------------------------------------- */
    const restrictedKeywords = [
        "usn", "attendance", "marks", "internal", "salary",
        "phone", "email", "employee id", "student details", "faculty details"
    ];

    if (userRole === "guest" && restrictedKeywords.some(k => message.toLowerCase().includes(k))) {
        return res.json({
            reply: "Sorry, that information is private and not accessible to the public. Please log in to access your personal academic data."
        });
    }

    /* ----------------------------------------------------
       2. Fetch Context with Caching
    ---------------------------------------------------- */
    let portalContext = context;

    if (!portalContext) {
        // Cache key based on user role to avoid redundant DB queries
        const cacheKey = `announcements_${userRole}`;

        portalContext = await cacheUtil.getOrSet(cacheKey, async () => {
            const query = { isActive: true };
            if (userRole === "guest") {
                query.targetAudience = "all";
            } else {
                query.targetAudience = { $in: [userRole, "all"] };
            }

            // Optimize: Select only necessary fields and limit results
            const announcements = await Announcement.find(query)
                .sort({ publishedAt: -1 })
                .limit(5)
                .select("title content category -_id")
                .lean(); // Use lean() for faster read-only queries

            return announcements
                .map(a => `Title: ${a.title}\nCategory: ${a.category}\nContent: ${a.content.substring(0, 200)}`)
                .join("\n\n");
        }, 600); // Cache for 10 minutes
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
    const messages = [
        { role: "system", content: collegeAIPrompt },
        { role: "system", content: accessRules },
        { role: "system", content: `College Portal Context:\n${portalContext || "No context available."}` },
        ...(Array.isArray(history) ? history.map(h => ({
            role: h.role === "user" ? "user" : "assistant",
            content: h?.parts?.[0]?.text || (typeof h.content === "string" ? h.content : "")
        })).filter(m => m.content).slice(-6) : []), // Limit history to last 6 messages
        { role: "user", content: message }
    ];

    /* ----------------------------------------------------
       5. Generate AI Response with Timeout
    ---------------------------------------------------- */
    try {
        // Create a promise that rejects after 15 seconds
        const timeoutPromise = new Promise((_, reject) =>
            setTimeout(() => reject(new Error('AI_TIMEOUT')), 15000)
        );

        const completionPromise = openai.chat.completions.create({
            model: "gpt-4o-mini",
            messages: messages,
            max_tokens: 400,
            temperature: 0.7,
        });

        // Race the API call against the timeout
        const completion = await Promise.race([completionPromise, timeoutPromise]);

        const reply = completion.choices[0]?.message?.content;
        if (!reply) throw new Error("EMPTY_RESPONSE");

        res.json({ reply });

    } catch (error) {
        console.error(`[AI Error] ${error.message}`);

        // Fallback responses based on error type
        let fallbackReply = "I'm sorry, I'm having trouble connecting to my brain right now. Please try again in a moment.";

        if (error.message === 'AI_TIMEOUT') {
            fallbackReply = "The request took too long. Please try a shorter question.";
        } else if (error.message.includes('rate_limit')) {
            fallbackReply = "I'm receiving too many questions right now. Please wait a minute.";
        }

        res.json({
            reply: fallbackReply,
            isFallback: true
        });
    }
});

module.exports = { chatWithAI };
