import { GoogleGenAI } from "@google/genai";
import { FaraidCalculation } from "../types";

export interface AIConsultationResponse {
  explanation: string;
  dalilAnalysis: string;
  advice: string;
}

export class GeminiService {
  private genAI: GoogleGenAI | null = null;

  constructor(apiKey: string) {
    if (apiKey) {
      this.genAI = new GoogleGenAI({ apiKey });
    }
  }

  async consult(calculation: FaraidCalculation): Promise<AIConsultationResponse> {
    if (!this.genAI) {
      throw new Error("API Key belum dikonfigurasi.");
    }

    const prompt = `
      Anda adalah seorang konsultan Faraid (Hukum Waris Islam) yang ahli. 
      Berikut adalah data hasil perhitungan waris:
      
      Total Harta Bersih: Rp ${calculation.afterPreDistribution.toLocaleString('id-ID')}
      
      Distribusi Ahli Waris:
      ${calculation.distributions.map(d => `- ${d.label}: Rp ${d.amount.toLocaleString('id-ID')} (${d.shareDescription})`).join('\n')}
      
      Tipe Penyesuaian: ${calculation.adjustmentType || 'Normal'}
      
      Mohon berikan:
      1. Penjelasan singkat mengapa pembagiannya seperti itu (Analisis Hijab/Mahjub).
      2. Analisis Dalil Al-Qur'an atau Hadits yang relevan untuk kasus spesifik ini.
      3. Nasihat bijak untuk para ahli waris agar tetap menjaga silaturahmi.
      
      Format jawaban harus dalam JSON yang valid dengan key: "explanation", "dalilAnalysis", "advice".
      Gunakan bahasa Indonesia yang santun dan mudah dipahami.
    `;

    try {
      const response = await this.genAI.models.generateContent({
        model: "gemini-3-flash-preview",
        contents: prompt
      });
      
      const text = response.text || "";
      
      // Clean the response if it contains markdown code blocks
      const jsonStr = text.replace(/```json|```/g, "").trim();
      return JSON.parse(jsonStr) as AIConsultationResponse;
    } catch (error: any) {
      console.error("Gemini API Error:", error);
      if (error.message?.includes("API_KEY_INVALID")) {
        throw new Error("API Key tidak valid. Silakan periksa kembali.");
      }
      if (error.message?.includes("quota")) {
        throw new Error("Kuota API telah habis. Silakan coba lagi nanti atau gunakan key lain.");
      }
      throw new Error("Gagal mendapatkan konsultasi AI. Pastikan koneksi internet stabil.");
    }
  }
}
