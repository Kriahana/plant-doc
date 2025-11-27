


import { Injectable } from '@angular/core';
import { GoogleGenAI, Type } from "@google/genai";

export interface AnalysisResult {
  isHealthy: boolean;
  issueName: string;
  description: string;
  recommendations: string[];
}

@Injectable({ providedIn: 'root' })
export class GeminiService {
  private ai: GoogleGenAI;

  constructor() {
    // IMPORTANT: The API key is sourced from environment variables.
    // Do not expose it in the client-side code in a real application.
    // This is a placeholder for the Applet environment.
    const apiKey = (process.env as any).API_KEY;
    if (!apiKey) {
        console.error("API_KEY environment variable not set.");
    }
    this.ai = new GoogleGenAI({ apiKey });
  }

  async analyzePlantImage(base64ImageData: string): Promise<AnalysisResult> {
    const prompt = `You must only accept real photographic images of trees or plants. Automatically reject any uploaded image that is animated, illustrated, cartoon-style, computer-generated, AI-generated, digitally drawn, or not representing a real-life physical plant. If the image is rejected, set "isHealthy" to false, "issueName" to "Invalid Image", "description" to "The uploaded image is not a real photograph of a plant. Please upload a clear, real-life photo.", and provide an empty array for "recommendations".

If the image is a valid photograph of a plant, analyze it. Identify any visible signs of nutritional deficiencies or diseases. Provide the name of the issue and a detailed description. For the "recommendations", provide a list of very short, actionable bullet points. Each point must be a concise, direct instruction (e.g., "Apply a nitrogen-rich fertilizer," "Water twice a week," "Move to a sunnier location"). Do not include lengthy explanations or extra information in the recommendations. If the plant appears healthy, state that clearly and provide general care tips in the same concise, point-wise format. Structure your response in the requested JSON format.`;

    const imagePart = {
      inlineData: {
        data: base64ImageData,
        mimeType: 'image/jpeg',
      },
    };

    const textPart = { text: prompt };
    
    const schema = {
        type: Type.OBJECT,
        properties: {
            isHealthy: { 
                type: Type.BOOLEAN, 
                description: 'Is the plant healthy?'
            },
            issueName: { 
                type: Type.STRING, 
                description: 'Name of the deficiency, disease, or "Healthy Plant".'
            },
            description: { 
                type: Type.STRING, 
                description: 'A detailed description of the findings.'
            },
            recommendations: {
                type: Type.ARRAY,
                items: { 
                    type: Type.STRING 
                },
                description: 'A list of recommended actions or care tips.'
            }
        },
        required: ['isHealthy', 'issueName', 'description', 'recommendations']
    };

    try {
      const response = await this.ai.models.generateContent({
        model: 'gemini-2.5-flash',
        contents: { parts: [imagePart, textPart] },
        config: {
            responseMimeType: "application/json",
            responseSchema: schema
        }
      });
      
      if (!response.text) {
        throw new Error('The AI model returned an empty response.');
      }

      const jsonString = response.text.trim();
      const result = JSON.parse(jsonString) as AnalysisResult;

      // Validate the structure of the AI's response
      if (!result || typeof result.isHealthy !== 'boolean' || !result.issueName || !result.description || !Array.isArray(result.recommendations)) {
        throw new Error('The AI model returned an invalid response format. Please try again.');
      }

      return result;

    } catch (error) {
      console.error('Error analyzing image with Gemini API:', error);
       if (error instanceof Error && (error.message.includes('invalid response format') || error.message.includes('empty response'))) {
        // Re-throw our custom validation error messages
        throw error;
      }
      // Generic error for network/API issues
      throw new Error('Failed to analyze the image. The AI model could not be reached or failed to process the request. Please check your connection and try again.');
    }
  }
}