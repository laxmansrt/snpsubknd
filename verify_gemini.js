require('dotenv').config();
const { GoogleGenerativeAI } = require("@google/generative-ai");

async function listModels() {
    try {
        if (!process.env.GEMINI_API_KEY) {
            console.error("❌ GEMINI_API_KEY is missing in .env");
            return;
        }

        const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY);
        console.log("Testing fallback model 'gemini-1.5-flash'...");
        const model = genAI.getGenerativeModel({ model: "gemini-1.5-flash" });
        const result = await model.generateContent("Hello?");
        const response = await result.response;
        console.log("✅ 'gemini-1.5-flash' works! Response:", response.text());

    } catch (error) {
        console.error("❌ 'gemini-1.5-flash' also failed:");
        console.error(error.message);
    }
}

listModels();
