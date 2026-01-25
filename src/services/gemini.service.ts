import { Injectable } from '@angular/core';
import { GoogleGenAI, Type } from "@google/genai";

export interface AnalysisResult {
  plantName: string;
  isHealthy: boolean;
  issueName: string;
  description: string;
  pestOrInsect: string;
  recommendations: string[];
}

@Injectable({ providedIn: 'root' })
export class GeminiService {
  private ai: GoogleGenAI;

  constructor() {
    const apiKey = (process.env as any).API_KEY;
    if (!apiKey) {
        console.error("API_KEY environment variable not set.");
    }
    this.ai = new GoogleGenAI({ apiKey });
  }

  async analyzePlantImage(base64ImageData: string): Promise<AnalysisResult> {
    if (!navigator.onLine) {
      throw new Error('You are currently offline. Please check your internet connection to use the AI analysis feature.');
    }
    
    const prompt = `You are an expert botanist and plant pathologist AI. Your tasks are to:
1.  **Identify the Plant:** First, classify the plant in the image. Provide its common name (e.g., "Tomato Plant", "Rose Bush"). If the plant cannot be identified, respond with "Unknown Plant".
2.  **Analyze Health:** Second, analyze the plant for health issues. Identify any visible signs of nutritional deficiencies or diseases. 
3.  **Detect Pests:** Third, identify any pests or insects on the plant or signs of their damage. If any are found, provide their common name (e.g., "Aphids", "Spider Mites"). If none are detected, state "None detected".
4.  **Handle Invalid Images:** You must only accept real photographic images of trees or plants. Automatically reject any uploaded image that is animated, illustrated, cartoon-style, computer-generated, AI-generated, digitally drawn, or not representing a real-life physical plant. If the image is rejected, set "plantName" to "Invalid Image", "isHealthy" to false, "issueName" to "Invalid Image", "pestOrInsect" to "N/A", "description" to "The uploaded image is not a real photograph of a plant. Please upload a clear, real-life photo.", and provide an empty array for "recommendations".

For valid images, provide a detailed description of the findings. For the "recommendations", provide a list of very short, actionable bullet points. Each point must be a concise, direct instruction (e.g., "Apply a nitrogen-rich fertilizer," "Spray with neem oil," "Move to a sunnier location"). If the plant appears healthy, state that clearly and provide general care tips in the same concise, point-wise format. Structure your response in the requested JSON format.`;

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
            plantName: { 
                type: Type.STRING, 
                description: 'The common name of the plant species identified in the image.'
            },
            isHealthy: { 
                type: Type.BOOLEAN, 
                description: 'Is the plant generally healthy?'
            },
            issueName: { 
                type: Type.STRING, 
                description: 'Name of the primary deficiency, disease, or "Healthy Plant".'
            },
            description: { 
                type: Type.STRING, 
                description: 'A detailed description of the findings.'
            },
            pestOrInsect: {
                type: Type.STRING,
                description: 'Name of any detected pest or insect, or "None detected".'
            },
            recommendations: {
                type: Type.ARRAY,
                items: { 
                    type: Type.STRING 
                },
                description: 'A list of recommended actions or care tips.'
            }
        },
        required: ['plantName', 'isHealthy', 'issueName', 'description', 'pestOrInsect', 'recommendations']
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
      if (!result || !result.plantName || typeof result.isHealthy !== 'boolean' || !result.issueName || !result.description || !result.pestOrInsect || !Array.isArray(result.recommendations)) {
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