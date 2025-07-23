
// supabase/functions/categorize-suggestions/index.ts
declare const Deno: any;

import { GoogleGenAI, Type, GenerateContentResponse } from "https://esm.sh/@google/genai@^1.10.0";

// Simplified suggestion structure for the AI
interface SimpleSuggestion {
  id: string;
  text: string;
}

// Expected structure from the AI
interface CategorizationResult {
  id: string;
  category: string;
}

// Get the API Key from the securely stored environment secrets
const API_KEY = Deno.env.get("API_KEY");
if (!API_KEY) {
  throw new Error("API_KEY environment variable not set!");
}
const ai = new GoogleGenAI({ apiKey: API_KEY });

const CORS_HEADERS = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

Deno.serve(async (req: Request) => {
  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: CORS_HEADERS });
  }

  try {
    const suggestions: SimpleSuggestion[] = await req.json();
    if (!suggestions || suggestions.length === 0) {
      return new Response(JSON.stringify({ error: "No suggestions provided" }), {
        status: 400,
        headers: { ...CORS_HEADERS, "Content-Type": "application/json" },
      });
    }

    const prompt = `
      You are an intelligent assistant for a game admin. Your task is to categorize user-submitted questions.
      Analyze the following list of question suggestions and assign a category to each one.
      
      Use these categories: "General Knowledge", "Pop Culture", "Personal Opinions", "Community-Specific", "Game Mechanics", "Miscellaneous".
      If a suggestion doesn't fit well, use "Miscellaneous".

      Here is the list of suggestions:
      ${JSON.stringify(suggestions)}
      
      Your response must be a JSON array where each object contains the original 'id' of the suggestion and the 'category' you assigned.
      Do not add any extra text, markdown, or explanations.
    `;

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
              id: { type: Type.STRING },
              category: { type: Type.STRING },
            },
            required: ["id", "category"],
          },
        },
      },
    });

    const resultText = response.text.trim();
    const categorizedList: CategorizationResult[] = JSON.parse(resultText);

    return new Response(JSON.stringify(categorizedList), {
      headers: { ...CORS_HEADERS, "Content-Type": "application/json" },
      status: 200,
    });

  } catch (error) {
    console.error("Error in Edge Function 'categorize-suggestions':", error);
    return new Response(JSON.stringify({ error: error.message }), {
      headers: { ...CORS_HEADERS, "Content-Type": "application/json" },
      status: 500,
    });
  }
});
