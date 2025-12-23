
import { GoogleGenAI } from "@google/genai";
import { Driver, TerrainType } from "../types";

const ai = new GoogleGenAI({ apiKey: process.env.API_KEY || '' });

export const getNarration = async (driver: Driver, terrain: TerrainType, isRest: boolean) => {
  try {
    const prompt = `You are a radio dispatcher communicating with a bus driver. 
    The driver is ${driver.name} from ${driver.origin}. 
    They are currently driving through a ${terrain} environment. 
    ${isRest ? "They have just arrived at a long-distance rest stop in a village." : "They are arriving at a standard passenger pick-up station."}
    The village has a mix of semi-permanent, traditional, and permanent buildings.
    Give a short, immersive 1-2 sentence update or encouragement in the character of a dispatcher. Keep it friendly and relevant to the location.`;

    const response = await ai.models.generateContent({
      model: 'gemini-3-flash-preview',
      contents: prompt,
      config: {
        maxOutputTokens: 100,
        temperature: 0.7,
      }
    });

    return response.text || "Safe travels, driver! Keep eyes on the road.";
  } catch (error) {
    console.error("Gemini Error:", error);
    return "Next stop ahead. Please slow down and prepare for passengers.";
  }
};
