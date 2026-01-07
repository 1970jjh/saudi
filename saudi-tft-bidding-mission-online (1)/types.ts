
export type Country = 'USA' | 'Germany' | 'China' | 'Korea';
export type UserRole = 'USER' | 'ADMIN' | null;

export interface CompetitorInfo {
  country: Country;
  strength: string;
  weakness: string;
}

export interface ScoreData {
  country: Country;
  creditRating: string;
  creditScore: number;
  performanceRank: number;
  performanceScore: number;
  technicalRank: number;
  technicalScore: number;
  costMillion: number;
  bidPriceMillion: number;
}

export interface BiddingSimulationResult {
  country: Country;
  priceScore: number;
  technicalScore: number;
  performanceScore: number;
  creditScore: number;
  totalScore: number;
  rank: number;
  bidPriceMillion: number;
}

export enum AppStep {
  SELECT_ROLE = 'SELECT_ROLE',
  ADMIN_LOGIN = 'ADMIN_LOGIN',
  TEAM_SELECTION = 'TEAM_SELECTION',
  INTRO = 'INTRO',
  LEARNING = 'LEARNING',
  ANALYSIS = 'ANALYSIS',
  RECORDS = 'RECORDS',
  SIMULATION = 'SIMULATION',
  RESULT = 'RESULT'
}
