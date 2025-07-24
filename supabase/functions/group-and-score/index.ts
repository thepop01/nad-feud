
// supabase/functions/group-and-score/index.ts

// The Supabase Edge Function environment provides a global `Deno` object.
// We declare it here as `any` to satisfy TypeScript and prevent "Cannot find name 'Deno'"
// errors during development, as the linter/compiler might not have Deno types loaded.
// This has no effect on the runtime behavior of the function.
declare const Deno: any;

import { GoogleGenAI, Type, GenerateContentResponse } from "https://esm.sh/@google/genai@^1.10.0";

// Define the expected structure of the incoming request body
interface RequestPayload {
  question: string;
  answers: string[];
}

// Define the structure of a grouped answer
interface GroupedAnswer {
  group_text: string;
  count: number;
  percentage: number;
}

// Get the API Key from the securely stored environment secrets
const API_KEY = Deno.env.get("API_KEY");
if (!API_KEY) {
  console.error("API_KEY environment variable not set!");
  throw new Error("API_KEY environment variable not set!");
}
const ai = new GoogleGenAI({ apiKey: API_KEY });

console.log("Edge Function 'group-and-score' initialized.");

// Define CORS headers for responses
const CORS_HEADERS = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

Deno.serve(async (req: Request) => {
  // 1. Handle CORS preflight requests
  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: CORS_HEADERS });
  }

  try {
    // 2. Extract payload from the request
    const { question, answers }: RequestPayload = await req.json();
    if (!question || !answers || answers.length === 0) {
      return new Response(JSON.stringify({ error: "Missing question or answers" }), {
        status: 400,
        headers: { ...CORS_HEADERS, "Content-Type": "application/json" },
      });
    }

    console.log(`Processing question: "${question}" with ${answers.length} answers.`);

    // 3. Construct the prompt for the Gemini API
    const prompt = `
      You are an intelligent answer-grouping assistant for a game called "Nad Feud".
      Your task is to analyze a list of user-submitted answers to a specific question and group them based on semantic similarity.
      
      Question: "${question}"
      
      Here is the list of raw answers submitted by users:
      ${JSON.stringify(answers)}
      
      Please perform the following steps:
      1. Group answers that mean the same thing. For example, "cat", "cats", "a cat", and "kitty" should be in the same group.
      2. For each group, create a concise and representative label (e.g., "Cats").
      3. Count how many raw answers fall into each group.
      4. Calculate the percentage of total users that fall into each group.
      5. Return ONLY the top 8 groups, sorted by count in descending order.
      
      Your final output must be a JSON array matching the provided schema. Do not add any extra text or markdown.
      `;

    // 4. Call the Gemini API
    const response: GenerateContentResponse = await ai.models.generateContent({
      model: 'gemini-2.5-flash',
      contents: prompt,
      config: {
        responseMimeType: "application/json",
        responseSchema: {
          type: Type.ARRAY,
          items: {
            type: Type.OBJECT,
            properties: {
              group_text: { type: Type.STRING },
              count: { type: Type.INTEGER },
              percentage: { type: Type.NUMBER },
            },
            required: ["group_text", "count", "percentage"],
          },
        },
      },
    });
    
    const resultText = response.text.trim();
    const result: GroupedAnswer[] = JSON.parse(resultText);
    console.log("Successfully received and parsed AI response.");

    // 5. Return the successful response
    return new Response(JSON.stringify(result), {
      headers: { ...CORS_HEADERS, "Content-Type": "application/json" },
      status: 200,
    });

  } catch (error) {
    console.error("Error in Edge Function:", error);
    return new Response(JSON.stringify({ error: error.message }), {
      headers: { ...CORS_HEADERS, "Content-Type": "application/json" },
      status: 500,
    });
  }
});
