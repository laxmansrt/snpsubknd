const OpenAI = require("openai");
const collegeAIPrompt = require("../prompts/collegeAIPrompt");
const Announcement = require("../models/Announcement");
const Transport = require("../models/Transport");
const Hostel = require("../models/Hostel");
const User = require("../models/User");
const Department = require("../models/Department");
const Subject = require("../models/Subject");
const asyncHandler = require('express-async-handler');
const cacheUtil = require('../utils/cache');

// Triggering fresh deploy to sync knowledge base
// Initialize Groq (via OpenAI SDK)
const openai = new OpenAI({
    apiKey: process.env.GROQ_API_KEY,
    baseURL: "https://api.groq.com/openai/v1"
});

/**
 * @desc    College AI Chat Assistant
 * @route   POST /api/ai/chat
 * @access  Public (Guest) / Private (Student, Faculty)
 */
const chatWithAI = asyncHandler(async (req, res) => {
    const { message, image, history = [], context } = req.body;
    const user = req.user;
    const userRole = user?.role || "guest";

    if (!process.env.GROQ_API_KEY) {
        res.status(500);
        throw new Error("AI service not configured. GROQ_API_KEY missing.");
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

            // B. Dynamic Transport Context
            const transportKeywords = ["bus", "route", "transport", "travel", "pickup", "stop"];
            if (message && transportKeywords.some(k => message.toLowerCase().includes(k))) {
                const routes = await Transport.find().limit(10).select("routeName routeNumber stops -_id").lean();
                if (routes.length > 0) {
                    contextParts.push("### LIVE TRANSPORT ROUTES ###\n" + routes.map(r => `Route ${r.routeNumber} (${r.routeName}): Stops at ${r.stops.join(" -> ")}`).join("\n"));
                }
            }

            // C. Dynamic Hostel Context
            const hostelKeywords = ["hostel", "room", "mess", "food", "menu", "allotment", "warden"];
            if (message && hostelKeywords.some(k => message.toLowerCase().includes(k))) {
                const rooms = await Hostel.find().limit(10).select("roomNumber floor blockName status type -_id").lean();
                const availableCount = await Hostel.countDocuments({ status: "available" });

                contextParts.push(`### HOSTEL AVAILABILITY ###\nTotal Available Rooms: ${availableCount}\nAvailable Rooms Preview: ` +
                    rooms.filter(r => r.status === "available").slice(0, 5).map(r => `Room ${r.roomNumber} (${r.type}, ${r.blockName})`).join(", "));

                const messRoom = await Hostel.findOne({ messMenu: { $exists: true, $ne: [] } }).select("messMenu -_id").lean();
                if (messRoom?.messMenu) {
                    contextParts.push("### WEEKLY MESS MENU ###\n" + messRoom.messMenu.map(m => `${m.day}: ${m.breakfast}, ${m.lunch}, ${m.dinner}`).join("\n"));
                }
            }

            // D. Academic & General University Info (Keywords: course, department, degree, study, engineering, science, art)
            const academicKeywords = ["course", "department", "degree", "study", "engineering", "science", "art", "subject", "available", "offer"];
            if (message && academicKeywords.some(k => message.toLowerCase().includes(k))) {
                const depts = await Department.find().select("name code duration hod -_id").lean();
                if (depts.length > 0) {
                    contextParts.push("### AVAILABLE DEPARTMENTS & COURSES ###\n" + depts.map(d => `- ${d.name} (${d.code}): ${d.duration} program, HOD: ${d.hod}`).join("\n"));
                }

                const subs = await Subject.find().limit(10).select("name code department -_id").lean();
                if (subs.length > 0) {
                    contextParts.push("### SAMPLE SUBJECTS OFFERED ###\n" + subs.map(s => `- ${s.name} (${s.code}) under ${s.department}`).join("\n"));
                }
            }

            // E. User-Specific Context
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
       3. Prepare Chat History for Groq
    ---------------------------------------------------- */
    const accessRules = userRole === "guest"
        ? `PUBLIC VISITOR. Rules: Only public info. NEVER reveal personal data. Refuse restricted questions.`
        : `AUTHENTICATED ${userRole.toUpperCase()}. Rules: Role-based permissions only. Student Info: USN ${user.studentData?.usn || 'N/A'}, Dept ${user.studentData?.department || 'N/A'}`;

    const validHistory = Array.isArray(history) ? history.map(h => ({
        role: h.role === "user" ? "user" : "assistant",
        content: h.parts?.[0]?.text || h.content || ""
    })).slice(-6) : [];

    const systemInstruction = `
${collegeAIPrompt}

${accessRules}

CURRENT CONTEXT FROM PORTAL:
${portalContext || "No dynamic context available."}
`;

    const messages = [
        { role: "system", content: systemInstruction },
        ...validHistory
    ];

    if (image) {
        // Groq text models (like llama-3.3-70b-versatile) do not support vision content blocks.
        // We strip the image and add a friendly note to the response later if needed,
        // or just process the text.
        messages.push({
            role: "user",
            content: (message || "Analyze this image") + " (Note: User sent an image, but vision is currently disabled. Process based on text only.)"
        });
    } else {
        messages.push({ role: "user", content: message });
    }

    /* ----------------------------------------------------
       4. Generate AI Response
    ---------------------------------------------------- */
    try {
        const response = await openai.chat.completions.create({
            model: "llama-3.3-70b-versatile", // Validated working model
            messages: messages,
            max_tokens: 500,
        });

        const reply = response.choices[0]?.message?.content;

        if (!reply) throw new Error("EMPTY_RESPONSE");

        res.json({ reply });

    } catch (error) {
        console.error(`[AI Error] ${error.message}`);

        let fallbackReply = "I'm sorry, I'm having trouble analyzing that request right now. Please try again.";
        if (error.status === 401) {
            fallbackReply = "Server configuration error: Invalid AI credentials.";
        }

        res.json({
            reply: fallbackReply,
            isFallback: true
        });
    }
});

module.exports = { chatWithAI };
