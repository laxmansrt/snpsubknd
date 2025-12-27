require('dotenv').config();
const OpenAI = require("openai");

async function testOpenAI() {
    try {
        if (!process.env.OPENAI_API_KEY) {
            console.error("❌ OPENAI_API_KEY is missing in .env");
            return;
        }

        console.log("Found OPENAI_API_KEY, testing connection...");
        const openai = new OpenAI({ apiKey: process.env.OPENAI_API_KEY });

        const response = await openai.chat.completions.create({
            model: "gpt-4o-mini",
            messages: [{ role: "user", content: "Hello, are you operational?" }],
        });

        console.log("✅ OpenAI API Response:", response.choices[0].message.content);
    } catch (error) {
        console.error("❌ OpenAI API Test Failed:");
        console.error(error.message);
    }
}

testOpenAI();
