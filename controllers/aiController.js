const OpenAI = require("openai");
const collegeAIPrompt = require("../prompts/collegeAIPrompt");
const Announcement = require("../models/Announcement");
const Transport = require("../models/Transport");
const Hostel = require("../models/Hostel");
const User = require("../models/User");

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
       2. Fetch Context with Dynamic Data Injection
    ---------------------------------------------------- */
    let portalContext = context;

    if (!portalContext) {
        const cacheKey = `portal_context_${userRole}_${user?._id || 'guest'}_${message?.substring(0, 20)}`;

        portalContext = await cacheUtil.getOrSet(cacheKey, async () => {
            let contextParts = [];

            // A. Base Announcements
            const announceQuery = { isActive: true };
            if (userRole === "guest") announceQuery.targetAudience = "all";
            else announceQuery.targetAudience = { $in: [userRole, "all"] };

            const announcements = await Announcement.find(announceQuery)
                .sort({ publishedAt: -1 })
                .limit(3)
                .select("title content category -_id")
                .lean();

            if (announcements.length > 0) {
                contextParts.push("### RECENT ANNOUNCEMENTS ###\n" + announcements.map(a => `- [${a.category}] ${a.title}: ${a.content.substring(0, 100)}...`).join("\n"));
            }

            // B. Dynamic Transport Context (Keywords: bus, route, transport, travel)
            const transportKeywords = ["bus", "route", "transport", "travel", "pickup", "stop"];
            if (message && transportKeywords.some(k => message.toLowerCase().includes(k))) {
                const routes = await Transport.find().limit(10).select("routeName routeNumber stops -_id").lean();
                if (routes.length > 0) {
                    contextParts.push("### LIVE TRANSPORT ROUTES ###\n" + routes.map(r => `Route ${r.routeNumber} (${r.routeName}): Stops at ${r.stops.join(" -> ")}`).join("\n"));
                }
            }

            // C. Dynamic Hostel Context (Keywords: hostel, room, mess, food, menu)
            const hostelKeywords = ["hostel", "room", "mess", "food", "menu", "allotment", "warden"];
            if (message && hostelKeywords.some(k => message.toLowerCase().includes(k))) {
                const rooms = await Hostel.find().limit(10).select("roomNumber floor blockName status type -_id").lean();
                const availableCount = await Hostel.countDocuments({ status: "available" });

                contextParts.push(`### HOSTEL AVAILABILITY ###\nTotal Available Rooms: ${availableCount}\nAvailable Rooms Preview: ` +
                    rooms.filter(r => r.status === "available").slice(0, 5).map(r => `Room ${r.roomNumber} (${r.type}, ${r.blockName})`).join(", "));

                // Get mess menu from any room
                const messRoom = await Hostel.findOne({ messMenu: { $exists: true, $ne: [] } }).select("messMenu -_id").lean();
                if (messRoom?.messMenu) {
                    contextParts.push("### WEEKLY MESS MENU ###\n" + messRoom.messMenu.map(m => `${m.day}: ${m.breakfast}, ${m.lunch}, ${m.dinner}`).join("\n"));
                }
            }

            // D. User-Specific Context (Fees, Personal Data)
            if (userRole === "student" && user?._id) {
                const fullUser = await User.findById(user._id).select("studentData -_id").lean();
                if (fullUser?.studentData) {
                    const sd = fullUser.studentData;
                    contextParts.push(`### YOUR ACADEMIC STATUS ###\nUSN: ${sd.usn}\nDept: ${sd.department}\nSem: ${sd.semester}\nAttendance: ${sd.attendance}%\nCGPA: ${sd.cgpa}`);
                }
            }

            return contextParts.join("\n\n");
        }, 300); // 5 minute cache
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
