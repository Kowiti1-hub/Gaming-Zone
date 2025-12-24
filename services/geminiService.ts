
import { GoogleGenAI, Modality } from "@google/genai";
import { Driver, TerrainType } from "../types";

const ai = new GoogleGenAI({ apiKey: process.env.API_KEY });

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

export const editImageWithAI = async (base64Image: string, prompt: string): Promise<string | null> => {
  try {
    const response = await ai.models.generateContent({
      model: 'gemini-2.5-flash-image',
      contents: {
        parts: [
          {
            inlineData: {
              mimeType: 'image/png',
              data: base64Image,
            },
          },
          {
            text: prompt,
          },
        ],
      },
    });

    const candidate = response.candidates?.[0];
    if (!candidate) return null;

    for (const part of candidate.content.parts) {
      if (part.inlineData) {
        return `data:${part.inlineData.mimeType};base64,${part.inlineData.data}`;
      }
    }
    return null;
  } catch (error) {
    console.error("AI Image Edit Error:", error);
    return null;
  }
};

export const getDriverIntroAudio = async (driver: Driver): Promise<string | null> => {
  try {
    const prompt = `Say a short, enthusiastic 1-sentence greeting as ${driver.name} from ${driver.origin}. 
    Make it culturally appropriate (e.g., if from Kenya, use a Swahili greeting; if from India, use a Hindi greeting). 
    Focus on being ready to drive the bus.`;

    const response = await ai.models.generateContent({
      model: "gemini-2.5-flash-preview-tts",
      contents: [{ parts: [{ text: prompt }] }],
      config: {
        responseModalities: [Modality.AUDIO],
        speechConfig: {
          voiceConfig: {
            // Mapping names to appropriate prebuilt voices
            prebuiltVoiceConfig: { 
              voiceName: driver.name === 'Daniella' ? 'Kore' : (driver.name === 'Malon' ? 'Zephyr' : 'Puck') 
            },
          },
        },
      },
    });

    return response.candidates?.[0]?.content?.parts?.[0]?.inlineData?.data || null;
  } catch (error) {
    console.error("TTS Error:", error);
    return null;
  }
};

// PCM Decoding helpers for the TTS output
export function decodeBase64(base64: string) {
  const binaryString = atob(base64);
  const bytes = new Uint8Array(binaryString.length);
  for (let i = 0; i < binaryString.length; i++) {
    bytes[i] = binaryString.charCodeAt(i);
  }
  return bytes;
}

export async function decodeAudioData(
  data: Uint8Array,
  ctx: AudioContext,
  sampleRate: number = 24000,
  numChannels: number = 1,
): Promise<AudioBuffer> {
  const dataInt16 = new Int16Array(data.buffer);
  const frameCount = dataInt16.length / numChannels;
  const buffer = ctx.createBuffer(numChannels, frameCount, sampleRate);

  for (let channel = 0; channel < numChannels; channel++) {
    const channelData = buffer.getChannelData(channel);
    for (let i = 0; i < frameCount; i++) {
      channelData[i] = dataInt16[i * numChannels + channel] / 32768.0;
    }
  }
  return buffer;
}
