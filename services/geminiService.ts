
import { GoogleGenAI, Type, GenerateContentResponse } from "@google/genai";
import { GroupedAnswer } from '../types';

const API_KEY = process.env.API_KEY;

if (!API_KEY) {
  console.warn("Gemini API key not found. Using mock data. Please set the API_KEY environment variable.");
}

const ai = API_KEY ? new GoogleGenAI({ apiKey: API_KEY }) : null;

// Mock function for when API key is not available
const getMockGroupedAnswers = (answers: string[]): GroupedAnswer[] => {
  console.log("Using mock Gemini response.");
  const uniqueAnswers = [...new Set(answers.map(a => a.toLowerCase().trim()))];
  const totalAnswers = answers.length;
  return uniqueAnswers.slice(0, 8).map((answer, i) => ({
    id: `mock-group-${i}`,
    question_id: 'mock-q-id',
    group_text: answer.charAt(0).toUpperCase() + answer.slice(1),
    count: Math.floor(Math.random() * (totalAnswers / 2)),
    percentage: parseFloat((Math.random() * 30).toFixed(2)),
  })).sort((a, b) => b.count - a.count);
};


export const groupAnswersWithAI = async (question: string, answers: string[]): Promise<GroupedAnswer[]> => {
  if (!ai) {
    return getMockGroupedAnswers(answers);
  }

  const prompt = `
    You are an intelligent answer-grouping assistant for a game called "Nad Feud".
    Your task is to analyze a list of user-submitted answers to a specific question and group them based on semantic similarity.
    
    Question: "${question}"
    
    Here is the list of raw answers submitted by users:
    ${JSON.stringify(answers)}
    
    Please perform the following steps:
    1.  Group answers that mean the same thing. For example, "cat", "cats", "a cat", and "kitty" should be in the same group.
    2.  For each group, create a concise and representative label (e.g., "Cats").
    3.  Count how many raw answers fall into each group.
    4.  Calculate the percentage of total users that fall into each group.
    5.  Return ONLY the top 8 groups, sorted by count in descending order.
    
    Your final output must be a JSON array matching the provided schema.
    `;

  try {
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
              group_text: {
                type: Type.STRING,
                description: 'The representative name for the answer group.',
              },
              count: {
                type: Type.INTEGER,
                description: 'The number of users in this group.',
              },
              percentage: {
                  type: Type.NUMBER,
                  description: 'The percentage of total users in this group.'
              }
            },
            required: ["group_text", "count", "percentage"],
          },
        },
      },
    });

    const jsonText = response.text;
    const result = JSON.parse(jsonText);
    
    // The Gemini result doesn't have id and question_id, so we add them.
    return result.map((group: Omit<GroupedAnswer, 'id' | 'question_id'>, index: number) => ({
      ...group,
      id: `ai-group-${Date.now()}-${index}`,
      question_id: '', // This will be set by the calling function
    }));

  } catch (error) {
    console.error("Error grouping answers with AI:", error);
    // Fallback to mock data in case of API error
    return getMockGroupedAnswers(answers);
  }
};
