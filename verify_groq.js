require('dotenv').config();
const OpenAI = require("openai");

async function testGroq() {
    try {
        if (!process.env.GROQ_API_KEY) {
            console.error("❌ GROQ_API_KEY is missing in .env");
            return;
        }

        console.log("Found GROQ_API_KEY, testing Groq connection...");
        const openai = new OpenAI({
            apiKey: process.env.GROQ_API_KEY,
            baseURL: "https://api.groq.com/openai/v1"
        });

        console.log("Testing 'llama-3.3-70b-versatile'...");
        const response = await openai.chat.completions.create({
            model: "llama-3.3-70b-versatile",
            messages: [{ role: "user", content: "Hello, are you operational?" }],
        });

        console.log("✅ Groq API Response:", response.choices[0].message.content);
    } catch (error) {
        console.error("❌ Groq API Test Failed:");
        console.error(error.message);
    }
}

testGroq();
