
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
    const prompt = `Analyze this image of a plant. Identify any visible signs of nutritional deficiencies or diseases. Provide the name of the issue, a detailed description, and a bulleted list of recommended management or treatment steps. If the plant appears healthy, state that clearly and provide general care tips. Structure your response in the requested JSON format.`;

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
      
      const jsonString = response.text.trim();
      return JSON.parse(jsonString) as AnalysisResult;

    } catch (error) {
      console.error('Error analyzing image with Gemini API:', error);
      throw new Error('Failed to analyze the image. The AI model could not process the request.');
    }
  }
}
