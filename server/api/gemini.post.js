import { GoogleGenerativeAI } from "@google/generative-ai";

export default defineEventHandler(async (event) => {
  const body = await readBody(event);
  const prompt = body.prompt;

  // **Important:** Replace with your actual Gemini API key
  const geminiApiKey = process.env.GEMINI_API_KEY;
  if (!geminiApiKey) {
    throw createError({
      statusCode: 500,
      statusMessage: "GEMINI_API_KEY environment variable not set.",
    });
  }

  const genAI = new GoogleGenerativeAI(geminiApiKey);
  const model = genAI.getGenerativeModel({ model: "gemini-1.5-flash-8b" }); // Or your preferred model

  try {
    const result = await model.generateContent(prompt);
    const response = await result.response;
    const summary = response.text();

    return { summary };
  } catch (error) {
    console.error("Error during AI response:", error);
    throw createError({
      statusCode: 500,
      statusMessage: "AI request failed.",
      data: { message: error.message },
    });
  }
});