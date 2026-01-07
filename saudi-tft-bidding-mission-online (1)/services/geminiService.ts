
import { GoogleGenAI, Type } from "@google/genai";
import { BiddingSimulationResult } from "../types";

const ai = new GoogleGenAI({ apiKey: process.env.API_KEY });

export const getStrategyFeedback = async (
  results: BiddingSimulationResult[],
  koreaProfit: number
) => {
  const koreaResult = results.find(r => r.country === 'Korea');
  if (!koreaResult) return "데이터 분석 중 오류가 발생했습니다.";

  const prompt = `
    사우디 TFT 입찰 미션 시뮬레이션 결과입니다. 
    사용자가 제시한 한국의 입찰가 정보와 결과입니다:
    - 한국 입찰가: ${koreaResult.bidPriceMillion}백만 달러
    - 예상 이익: ${koreaProfit}백만 달러
    - 한국 순위: ${koreaResult.rank}위
    - 한국 총점: ${koreaResult.totalScore}점
    
    경쟁사 점수:
    ${results.map(r => `${r.country}: ${r.totalScore}점 (${r.rank}위, 입찰가 $${r.bidPriceMillion}M)`).join('\n')}

    CEO의 입장에서 이 결과에 대해 칭찬이나 피드백을 한 문단으로 작성해주세요. 
    만약 1위가 아니라면 어떻게 전략을 수정해야 할지 힌트를 주시고, 
    1위라면 수익성을 더 극대화할 수 있는지 혹은 안전한 승리인지 평가해주세요.
    말투는 엄격하지만 격려하는 한국 대기업 CEO 말투로 부탁드립니다.
  `;

  try {
    const response = await ai.models.generateContent({
      model: 'gemini-3-flash-preview',
      contents: prompt,
    });
    return response.text;
  } catch (error) {
    console.error("Gemini Error:", error);
    return "CEO 피드백을 불러오는 데 실패했습니다. 하지만 결과는 여전합니다. 계속 분석하세요!";
  }
};
