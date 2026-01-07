
import { CompetitorInfo, ScoreData } from './types';

export const MISSION_SLIDES = [
  {
    title: "사우디 비전 2030",
    content: "사우디아라비아는 석유 산업 의존도를 낮추기 위해 사업 '비전 2030'을 추진 중이며, 관련 사업을 개발/운영할 전문 노하우를 가진 글로벌 기업을 선정하려 합니다.",
    image: "🇸🇦"
  },
  {
    title: "7억 달러의 기회",
    content: "이번 입찰은 향후 7억 달러 규모의 사업을 독점 운영할 수 있는 초대형 국책 사업입니다.",
    image: "💰"
  },
  {
    title: "수주 미션",
    content: "회사의 이익을 극대화하면서 반드시 입찰에서 1위 할 수 있는 '최적의 제안가'를 도출하십시오.",
    image: "🎯"
  }
];

export const COMPETITOR_DETAILS: CompetitorInfo[] = [
  {
    country: 'USA',
    strength: '압도적인 대외 영향력',
    weakness: '높은 인건비로 인한 원가 경쟁력 취약'
  },
  {
    country: 'Germany',
    strength: '세계 최고의 정밀 기술력',
    weakness: '보수적인 리스크 관리로 인한 가격 경직성'
  },
  {
    country: 'China',
    strength: '정부 보조금을 등에 업은 저가 공세',
    weakness: '낮은 국제 신용도와 품질 불안정'
  }
];

// All 108 Information Card URLs provided by the user
export const INFO_CARD_IMAGES = [
  "https://i.ibb.co/gbG1Gh6p/A-1.jpg", "https://i.ibb.co/x83QrNxb/A-2.jpg", "https://i.ibb.co/KxY9PH0t/A-3.jpg", "https://i.ibb.co/G4tVz18g/A-4.jpg", "https://i.ibb.co/fYnD4f6J/A-5.jpg", "https://i.ibb.co/wZZ2j5W8/A-6.jpg", "https://i.ibb.co/spNdQJXL/A-7.jpg", "https://i.ibb.co/1YqpYPVZ/A-8.jpg", "https://i.ibb.co/0VdsYmtq/A-9.jpg", "https://i.ibb.co/4rtPhPC/A-10.jpg", "https://i.ibb.co/1tZBcHyH/A-11.jpg", "https://i.ibb.co/1YTb8J4k/A-12.jpg", "https://i.ibb.co/TD0nD880/A-13.jpg", "https://i.ibb.co/BMz86V9/A-14.jpg", "https://i.ibb.co/s0j7qpN/A-15.jpg", "https://i.ibb.co/v46z68qV/A-16.jpg", "https://i.ibb.co/9381Z1qb/A-17.jpg", "https://i.ibb.co/vvqHhWTW/A-18.jpg", "https://i.ibb.co/WpcJxD0v/A-19.jpg", "https://i.ibb.co/KxmhDM20/A-20.jpg", "https://i.ibb.co/B5NvJ16k/A-21.jpg", "https://i.ibb.co/Lm0hnC8/A-22.jpg", "https://i.ibb.co/7dwFVR4j/A-23.jpg", "https://i.ibb.co/dFxYVmh/A-24.jpg", "https://i.ibb.co/XxL9b9pK/A-25.jpg", "https://i.ibb.co/4ZJ7zxXn/A-26.jpg", "https://i.ibb.co/yBRHNVwv/A-27.jpg",
  "https://i.ibb.co/q8DMynr/B-1.jpg", "https://i.ibb.co/Kzhjzzvw/B-2.jpg", "https://i.ibb.co/xKNY1dWR/B-3.jpg", "https://i.ibb.co/hjgRnSH/B-4.jpg", "https://i.ibb.co/X95qfr7/B-5.jpg", "https://i.ibb.co/NdMcVyJJ/B-6.jpg", "https://i.ibb.co/BhpFB1F/B-7.jpg", "https://i.ibb.co/zh8D7Bdc/B-8.jpg", "https://i.ibb.co/CpPhMF67/B-9.jpg", "https://i.ibb.co/prNf7Tbj/B-10.jpg", "https://i.ibb.co/23xKpT76/B-11.jpg", "https://i.ibb.co/1GCxGDxF/B-12.jpg", "https://i.ibb.co/CpBC4tty/B-13.jpg", "https://i.ibb.co/Csvnc47K/B-14.jpg", "https://i.ibb.co/Y7Sp9ytc/B-15.jpg", "https://i.ibb.co/Q7ppW6kg/B-16.jpg", "https://i.ibb.co/7LtgT9f/B-17.jpg", "https://i.ibb.co/TqKbsW9J/B-18.jpg", "https://i.ibb.co/7twYQLwL/B-19.jpg", "https://i.ibb.co/BH9WsJfJ/B-20.jpg", "https://i.ibb.co/QFKFz0h6/B-21.jpg", "https://i.ibb.co/VYJkLb2p/B-22.jpg", "https://i.ibb.co/wZV45ZZc/B-23.jpg", "https://i.ibb.co/SXvr7f30/B-24.jpg", "https://i.ibb.co/21BsVGN0/B-25.jpg", "https://i.ibb.co/tws4Qv5m/B-26.jpg", "https://i.ibb.co/jvH9yZBt/B-27.jpg",
  "https://i.ibb.co/VWyyfXwx/C-1.jpg", "https://i.ibb.co/nszmVRmP/C-2.jpg", "https://i.ibb.co/C5pYFZ11/C-3.jpg", "https://i.ibb.co/cKbTTbtb/C-4.jpg", "https://i.ibb.co/0yr5nRkT/C-5.jpg", "https://i.ibb.co/Kp9wXGqp/C-6.jpg", "https://i.ibb.co/NdcJhfZY/C-7.jpg", "https://i.ibb.co/f70YSWt/C-8.jpg", "https://i.ibb.co/rR8XVVLX/C-9.jpg", "https://i.ibb.co/zTyJ0n3X/C-10.jpg", "https://i.ibb.co/75hpLQb/C-11.jpg", "https://i.ibb.co/xtZ7rfQq/C-12.jpg", "https://i.ibb.co/99bHSGk3/C-13.jpg", "https://i.ibb.co/vCQSFWKH/C-14.jpg", "https://i.ibb.co/s9gHLNRd/C-15.jpg", "https://i.ibb.co/9HYr5wp5/C-16.jpg", "https://i.ibb.co/1tHKRhqv/C-17.jpg", "https://i.ibb.co/JRtx65PX/C-18.jpg", "https://i.ibb.co/FqWRjxcW/C-19.jpg", "https://i.ibb.co/prsRCZc7/C-20.jpg", "https://i.ibb.co/gFSP2WKm/C-21.jpg", "https://i.ibb.co/tMZpFCXD/C-22.jpg", "https://i.ibb.co/TMkpmCmS/C-23.jpg", "https://i.ibb.co/SDY2n8Md/C-24.jpg", "https://i.ibb.co/Myk8c1nc/C-25.jpg", "https://i.ibb.co/tpH9F1NL/C-26.jpg", "https://i.ibb.co/rGJfdY74/C-27.jpg",
  "https://i.ibb.co/359b3v0Q/D-1.jpg", "https://i.ibb.co/vxVf257K/D-2.jpg", "https://i.ibb.co/wZKwVgW3/D-3.jpg", "https://i.ibb.co/0VvHZrds/D-4.jpg", "https://i.ibb.co/Kxmzkq4v/D-5.jpg", "https://i.ibb.co/ymn8ptfS/D-6.jpg", "https://i.ibb.co/HT3CSfgj/D-7.jpg", "https://i.ibb.co/yn5BfMQQ/D-8.jpg", "https://i.ibb.co/5gzv40Ht/D-9.jpg", "https://i.ibb.co/wFSCx1NP/D-10.jpg", "https://i.ibb.co/fzC45YGt/D-11.jpg", "https://i.ibb.co/BVycJ8RL/D-12.jpg", "https://i.ibb.co/sd1KzsqK/D-13.jpg", "https://i.ibb.co/Jw6TBhCp/D-14.jpg", "https://i.ibb.co/nMHrbtbd/D-15.jpg", "https://i.ibb.co/93dNYQK5/D-16.jpg", "https://i.ibb.co/Cs1f7zXv/D-17.jpg", "https://i.ibb.co/dsptznPq/D-18.jpg", "https://i.ibb.co/svT6Hpzn/D-19.jpg", "https://i.ibb.co/NdqNP6B2/D-20.jpg", "https://i.ibb.co/gZntSVGT/D-21.jpg", "https://i.ibb.co/ccK9G8sN/D-22.jpg", "https://i.ibb.co/ZzQW2HRw/D-23.jpg", "https://i.ibb.co/Z18gxnGs/D-24.jpg", "https://i.ibb.co/PvDtdRxw/D-25.jpg", "https://i.ibb.co/C3q2k7dR/D-26.jpg", "https://i.ibb.co/YTjFLtw0/D-27.jpg"
];

export const COMPETITOR_DATA: Partial<Record<string, ScoreData>> = {
  'USA': { country: 'USA', creditRating: 'AAA', creditScore: 10, performanceRank: 4, performanceScore: 14, technicalRank: 3, technicalScore: 24, costMillion: 620, bidPriceMillion: 664 },
  'Germany': { country: 'Germany', creditRating: 'AAA', creditScore: 10, performanceRank: 2, performanceScore: 18, technicalRank: 1, technicalScore: 30, costMillion: 640, bidPriceMillion: 698 },
  'China': { country: 'China', creditRating: 'B', creditScore: 7, performanceRank: 1, performanceScore: 20, technicalRank: 4, technicalScore: 21, costMillion: 590, bidPriceMillion: 617 }
};

export const KOREA_FIXED_DATA = {
  country: 'Korea' as const,
  creditRating: 'AAA',
  creditScore: 10,
  performanceRank: 3,
  performanceScore: 16,
  technicalRank: 2,
  technicalScore: 27,
  costMillion: 600,
};

export const PRICE_SCORE_MAPPING: Record<number, number> = {
  1: 40,
  2: 37,
  3: 34,
  4: 31
};
