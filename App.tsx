
import React, { useState, useEffect, useCallback, useMemo, useRef } from 'react';
import { AppStep, UserRole, BiddingSimulationResult } from './types';
import { COMPETITOR_DATA, KOREA_FIXED_DATA, PRICE_SCORE_MAPPING, MISSION_SLIDES, COMPETITOR_DETAILS, INFO_CARD_IMAGES } from './constants';
import { StepIndicator } from './components/StepIndicator';
import { getStrategyFeedback } from './services/geminiService';
import {
  subscribeToSession,
  subscribeToActiveSessions,
  subscribeToAllSessions,
  subscribeToSubmissions,
  subscribeToTeamNotes,
  createSession,
  revealResults,
  resetSessionResults,
  clearAllSubmissions,
  submitTeamResult,
  saveTeamNotes,
  updateSessionState,
  deleteSession,
  SessionState
} from './services/firestoreService';

type AdminSubView = 'dashboard' | 'submissions';

const CORRECT_ANSWERS = {
  userPrice: 663,
  expectedProfit: 63,
  scores: {
    USA: 82,
    Germany: 89,
    China: 88,
    Korea: 90
  }
};

const App: React.FC = () => {
  const [role, setRole] = useState<UserRole>(null);
  const [step, setStep] = useState<AppStep>(AppStep.SELECT_ROLE);
  const [adminPassword, setAdminPassword] = useState<string>('');
  const [loginError, setLoginError] = useState<boolean>(false);
  const [adminSubView, setAdminSubView] = useState<AdminSubView>('dashboard');

  // Session States
  const [currentSessionId, setCurrentSessionId] = useState<string | null>(null);
  const [availableSessions, setAvailableSessions] = useState<SessionState[]>([]);
  const [allSessions, setAllSessions] = useState<SessionState[]>([]);
  const [sessionName, setSessionName] = useState<string>('');
  const [maxTeams, setMaxTeams] = useState<number>(12);
  const [isSessionActive, setIsSessionActive] = useState<boolean>(false);
  const [isResultsRevealed, setIsResultsRevealed] = useState<boolean>(false);
  const [newSessionName, setNewSessionName] = useState<string>('');
  const [newSessionTeams, setNewSessionTeams] = useState<number>(12);

  // Student States
  const [selectedTeam, setSelectedTeam] = useState<number | null>(null);
  const [studentName, setStudentName] = useState<string>('');
  const [showInfoCard, setShowInfoCard] = useState<boolean>(false);
  const [zoomedIndex, setZoomedIndex] = useState<number | null>(null);
  const [hasSubmitted, setHasSubmitted] = useState<boolean>(false);
  
  // Advanced Records State
  const [notes, setNotes] = useState<string[]>(['']);
  const [isSyncing, setIsSyncing] = useState<boolean>(false);
  const syncTimeoutRef = useRef<number | null>(null);

  // Submission States
  const [userPrice, setUserPrice] = useState<string>('');
  const [expectedProfit, setExpectedProfit] = useState<string>('');
  const [manualScores, setManualScores] = useState<Record<string, string>>({
    USA: '',
    Germany: '',
    China: '',
    Korea: ''
  });
  const [results, setResults] = useState<BiddingSimulationResult[]>([]);
  const [ceoFeedback, setCeoFeedback] = useState<string>('');
  const [loading, setLoading] = useState<boolean>(false);

  // Admin: Team Submissions Tracking
  const [teamSubmissions, setTeamSubmissions] = useState<Record<number, { name: string; price: string; profit: string; scores: { USA: string; Germany: string; China: string; Korea: string }; timestamp: number }>>({});

  // Subscribe to active sessions list (for learners)
  useEffect(() => {
    const unsubscribe = subscribeToActiveSessions((sessions) => {
      setAvailableSessions(sessions);
    });
    return () => unsubscribe();
  }, []);

  // Subscribe to all sessions (for admin)
  useEffect(() => {
    if (role === 'ADMIN') {
      const unsubscribe = subscribeToAllSessions((sessions) => {
        setAllSessions(sessions);
      });
      return () => unsubscribe();
    }
  }, [role]);

  // Subscribe to current session state and submissions
  useEffect(() => {
    if (!currentSessionId) return;

    const unsubscribeSession = subscribeToSession(currentSessionId, (state) => {
      if (state) {
        setIsResultsRevealed(state.isResultsRevealed);
        setSessionName(state.sessionName);
        setMaxTeams(state.maxTeams);
        setIsSessionActive(state.isSessionActive);
      }
    });

    const unsubscribeSubmissions = subscribeToSubmissions(currentSessionId, (submissions) => {
      setTeamSubmissions(submissions);
    });

    return () => {
      unsubscribeSession();
      unsubscribeSubmissions();
    };
  }, [currentSessionId]);

  // Team-specific sync for notes via Firestore
  useEffect(() => {
    if (selectedTeam && currentSessionId) {
      const unsubscribe = subscribeToTeamNotes(currentSessionId, selectedTeam, (notesData) => {
        setNotes(notesData);
        setIsSyncing(true);
        setTimeout(() => setIsSyncing(false), 500);
      });
      return () => unsubscribe();
    }
  }, [selectedTeam, currentSessionId]);

  const handleNoteChange = (index: number, value: string) => {
    const newNotes = [...notes];
    newNotes[index] = value;
    if (index === notes.length - 1 && value.trim() !== '') newNotes.push('');
    setNotes(newNotes);
    setIsSyncing(true);
    if (syncTimeoutRef.current) window.clearTimeout(syncTimeoutRef.current);
    syncTimeoutRef.current = window.setTimeout(async () => {
      if (selectedTeam && currentSessionId) {
        await saveTeamNotes(currentSessionId, selectedTeam, newNotes);
      }
      setIsSyncing(false);
    }, 800);
  };

  const removeNote = async (index: number) => {
    if (notes.length <= 1) {
      setNotes(['']);
      if (selectedTeam && currentSessionId) await saveTeamNotes(currentSessionId, selectedTeam, ['']);
      return;
    }
    const newNotes = notes.filter((_, i) => i !== index);
    setNotes(newNotes);
    if (selectedTeam && currentSessionId) await saveTeamNotes(currentSessionId, selectedTeam, newNotes);
  };

  const calculateRanks = useCallback((koreaPrice: number) => {
    if (isNaN(koreaPrice)) return;
    const allParticipants = [
      ...Object.values(COMPETITOR_DATA),
      { ...KOREA_FIXED_DATA, bidPriceMillion: koreaPrice }
    ];
    const sortedByPrice = [...allParticipants].sort((a, b) => (a?.bidPriceMillion || 0) - (b?.bidPriceMillion || 0));
    const priceRanks: Record<string, number> = {};
    sortedByPrice.forEach((p, idx) => { if (p) priceRanks[p.country] = idx + 1; });
    const finalScores: BiddingSimulationResult[] = allParticipants.map(p => {
      if (!p) return null;
      const pRank = priceRanks[p.country];
      const pScore = PRICE_SCORE_MAPPING[pRank];
      return {
        country: p.country,
        priceScore: pScore,
        technicalScore: p.technicalScore,
        performanceScore: p.performanceScore,
        creditScore: p.creditScore,
        totalScore: pScore + p.technicalScore + p.performanceScore + p.creditScore,
        rank: 0,
        bidPriceMillion: p.bidPriceMillion || 0
      };
    }).filter((r): r is BiddingSimulationResult => r !== null);
    const sortedByTotal = [...finalScores].sort((a, b) => b.totalScore - a.totalScore);
    sortedByTotal.forEach((r, idx) => {
      const original = finalScores.find(f => f.country === r.country);
      if (original) original.rank = idx + 1;
    });
    setResults(finalScores);
  }, []);

  useEffect(() => {
    calculateRanks(Number(userPrice));
  }, [userPrice, calculateRanks]);

  const handleAdminLogin = () => {
    if (adminPassword === '6749467') {
      setRole('ADMIN');
      setStep(AppStep.RESULT); 
      setLoginError(false);
      setAdminPassword('');
      setAdminSubView('dashboard');
    } else {
      setLoginError(true);
      setAdminPassword('');
    }
  };

  const triggerReveal = async () => {
    if (!currentSessionId) return;
    await revealResults(currentSessionId);
    setIsResultsRevealed(true);
  };

  const triggerReset = async () => {
    if (!currentSessionId) return;
    await resetSessionResults(currentSessionId);
    await clearAllSubmissions(currentSessionId, maxTeams);
    setIsResultsRevealed(false);
    setHasSubmitted(false);
  };

  const handleCreateSession = async () => {
    if (!newSessionName.trim()) return;
    const sessionId = await createSession(newSessionName, newSessionTeams);
    setCurrentSessionId(sessionId);
    setNewSessionName('');
    setNewSessionTeams(12);
  };

  const handleSelectSession = (session: SessionState) => {
    setCurrentSessionId(session.id);
    setSessionName(session.sessionName);
    setMaxTeams(session.maxTeams);
    setIsResultsRevealed(session.isResultsRevealed);
    if (role === 'USER') {
      setStep(AppStep.TEAM_SELECTION);
    }
  };

  const handleFinalSubmit = async () => {
    setLoading(true);
    setHasSubmitted(true);

    // Save submission to Firestore
    if (selectedTeam && currentSessionId) {
      await submitTeamResult(currentSessionId, selectedTeam, {
        name: studentName,
        price: userPrice,
        profit: expectedProfit,
        scores: manualScores as { USA: string; Germany: string; China: string; Korea: string }
      });
    }

    const feedback = await getStrategyFeedback(results, Number(expectedProfit));
    setCeoFeedback(feedback);
    setLoading(false);
  };

  const handleNext = () => {
    if (step === AppStep.INTRO) setStep(AppStep.ANALYSIS);
    else if (step === AppStep.ANALYSIS) setStep(AppStep.RECORDS);
    else if (step === AppStep.RECORDS) setStep(AppStep.SIMULATION);
    else if (step === AppStep.SIMULATION) handleFinalSubmit();
  };

  const handleBack = () => {
    if (step === AppStep.INTRO) setStep(AppStep.TEAM_SELECTION);
    else if (step === AppStep.TEAM_SELECTION) setStep(AppStep.SESSION_SELECTION);
    else if (step === AppStep.SESSION_SELECTION) { setRole(null); setStep(AppStep.SELECT_ROLE); }
    else if (step === AppStep.ANALYSIS) setStep(AppStep.INTRO);
    else if (step === AppStep.RECORDS) setStep(AppStep.ANALYSIS);
    else if (step === AppStep.SIMULATION) setStep(AppStep.RECORDS);
    else if (step === AppStep.RESULT) setStep(AppStep.SIMULATION);
  };

  const getCountryIcon = (country: string) => {
    switch (country) {
      case 'USA': return 'https://i.ibb.co/zTvfYwmk/US.png';
      case 'Germany': return 'https://i.ibb.co/jkSwLzRp/DE.png';
      case 'China': return 'https://i.ibb.co/bg08JSCJ/CN.png';
      case 'Korea': return 'https://i.ibb.co/hFWRvYpp/KR.png';
      default: return '';
    }
  };

  const getCountryDisplayName = (country: string) => {
    switch (country) {
      case 'USA': return '미국';
      case 'Germany': return '독일';
      case 'China': return '중국';
      case 'Korea': return '대한민국';
      default: return country;
    }
  };

  const getImageLabel = (url: string) => {
    const parts = url.split('/');
    const lastPart = parts[parts.length - 1];
    return lastPart.replace('.jpg', '');
  };

  const teamAssignedImages = useMemo(() => {
    if (!selectedTeam || !maxTeams) return [];
    const total = INFO_CARD_IMAGES.length;
    const startIndex = Math.floor((selectedTeam - 1) * (total / maxTeams));
    const endIndex = Math.floor(selectedTeam * (total / maxTeams));
    return INFO_CARD_IMAGES.slice(startIndex, endIndex);
  }, [selectedTeam, maxTeams]);

  const renderInfoCardModal = () => {
    if (!showInfoCard) return null;
    return (
      <div className="absolute inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/10 backdrop-blur-sm overflow-hidden animate-in fade-in duration-500 rounded-[40px]">
        <div className="w-full h-[82%] bg-white rounded-[32px] shadow-2xl p-6 flex flex-col relative border border-slate-100">
          <div className="flex justify-between items-center mb-6">
            <div>
              <h3 className="text-xl font-black text-slate-900 tracking-tight">정보 카드첩</h3>
              <p className="text-[10px] text-slate-400 font-bold uppercase tracking-widest">{selectedTeam}조 전용 기밀 분석자료</p>
            </div>
            <button onClick={() => { setShowInfoCard(false); setZoomedIndex(null); }} className="w-10 h-10 rounded-full bg-slate-50 flex items-center justify-center hover:bg-slate-100 transition-all hover:rotate-90">
              <span className="text-2xl leading-none">&times;</span>
            </button>
          </div>
          <div className="flex-1 overflow-y-auto no-scrollbar grid grid-cols-3 gap-2 pr-1">
            {teamAssignedImages.map((url, idx) => (
              <button key={idx} onClick={() => setZoomedIndex(idx)} className="aspect-[3/4] rounded-2xl overflow-hidden bg-slate-50 hover:scale-105 transition-all active:scale-95 relative border border-slate-100 shadow-sm">
                <img src={url} alt="" className="w-full h-full object-cover" />
                <div className="absolute top-1.5 right-1.5 bg-black/40 backdrop-blur-sm px-1.5 py-0.5 rounded-lg text-[7px] font-black text-white uppercase">{getImageLabel(url)}</div>
              </button>
            ))}
          </div>
          <button onClick={() => setShowInfoCard(false)} className="w-full bg-slate-900 text-white py-4 rounded-2xl mt-6 font-bold tracking-tight shadow-xl shadow-slate-200 hover:bg-slate-800 transition-colors">닫기</button>
        </div>
        {zoomedIndex !== null && (
          <div className="absolute inset-0 z-[60] bg-slate-900/98 flex items-center justify-center p-4 animate-in zoom-in-95 duration-300 rounded-[40px]" onClick={() => setZoomedIndex(null)}>
            <div className="relative group max-w-full max-h-full flex items-center justify-center" onClick={(e) => e.stopPropagation()}>
               <div className="absolute top-8 right-6 z-20 bg-white/10 backdrop-blur-xl px-5 py-2.5 border border-white/20 text-white text-xs font-bold uppercase tracking-widest rounded-full shadow-2xl">{getImageLabel(teamAssignedImages[zoomedIndex])}</div>
               <img src={teamAssignedImages[zoomedIndex]} className="max-w-full max-h-[75vh] rounded-[40px] shadow-2xl object-contain border border-white/10" alt="" />
               <button onClick={(e) => { e.stopPropagation(); const len = teamAssignedImages.length; setZoomedIndex((zoomedIndex - 1 + len) % len); }} className="absolute left-2 top-1/2 -translate-y-1/2 w-12 h-12 rounded-full bg-white/10 backdrop-blur-xl flex items-center justify-center text-white hover:bg-white/20 transition-all active:scale-90 z-10"><span className="text-3xl leading-none">‹</span></button>
               <button onClick={(e) => { e.stopPropagation(); const len = teamAssignedImages.length; setZoomedIndex((zoomedIndex + 1) % len); }} className="absolute right-2 top-1/2 -translate-y-1/2 w-12 h-12 rounded-full bg-white/10 backdrop-blur-xl flex items-center justify-center text-white hover:bg-white/20 transition-all active:scale-90 z-10"><span className="text-3xl leading-none">›</span></button>
               <button className="absolute top-8 left-6 w-10 h-10 bg-white rounded-full flex items-center justify-center font-bold text-slate-900 shadow-xl z-[70] hover:bg-red-500 hover:text-white transition-all" onClick={() => setZoomedIndex(null)}>&times;</button>
            </div>
          </div>
        )}
      </div>
    );
  };

  const NavigationBar = ({ nextLabel = "다음으로", showBack = true, onNext = handleNext, showInfoBanner = true }) => (
    <div className="flex flex-col gap-2 mt-4 w-full shrink-0 pb-4">
      <div className="flex gap-2 w-full">
        {showBack && <button onClick={handleBack} className="flex-1 iso-button bg-white py-3 px-4 font-bold text-slate-500 text-xs">뒤로</button>}
        <button onClick={onNext} className="flex-[2] iso-button iso-button-primary py-3 px-4 font-bold text-xs tracking-tight">{nextLabel}</button>
      </div>
      {showInfoBanner && (
        <button onClick={() => setShowInfoCard(true)} className="w-full bg-emerald-50 rounded-[18px] p-3 flex items-center justify-center gap-3 group border border-emerald-100 transition-all hover:bg-emerald-100 hover:shadow-lg hover:shadow-emerald-100/50">
          <span className="text-lg">📁</span>
          <span className="text-xs font-bold text-emerald-900 tracking-tight">정보카드 확인</span>
          <span className="text-[10px] text-emerald-500 font-bold ml-auto opacity-60">TOUCH &rarr;</span>
        </button>
      )}
    </div>
  );

  const renderRoleSelection = () => (
    <div className="flex flex-col h-full items-center justify-center px-8 py-10 overflow-hidden">
      <div className="relative mb-14">
        <div className="w-32 h-32 bg-emerald-500 rounded-[44px] shadow-2xl shadow-emerald-200 flex items-center justify-center animate-float glow-emerald"><span className="text-6xl">💰</span></div>
      </div>
      <h1 className="text-5xl font-black text-slate-900 tracking-tighter text-center mb-1 leading-tight">Saudi TFT Mission</h1>
      <p className="text-slate-400 font-bold uppercase tracking-[0.4em] text-[8px] mb-12">Vision 2030</p>
      <div className="w-full space-y-4">
        <button
          onClick={() => { setRole('USER'); setStep(AppStep.SESSION_SELECTION); }}
          className="w-full iso-card p-5 flex items-center group border-2 border-emerald-500 shadow-lg shadow-emerald-100/50"
        >
          <div className="w-14 h-14 bg-emerald-50 rounded-2xl flex items-center justify-center text-3xl mr-4 group-hover:scale-110 transition-transform">📱</div>
          <div className="text-left">
            <div className="font-bold text-lg text-slate-900 leading-none mb-1">학습자 입장</div>
            <div className="text-[8px] font-bold text-slate-400 uppercase tracking-widest">Deploy Field Agent</div>
          </div>
        </button>
        <button
          onClick={() => { setRole('ADMIN'); setStep(AppStep.ADMIN_LOGIN); }}
          className="w-full iso-card p-5 flex items-center group bg-slate-100 border-slate-200 shadow-none hover:bg-slate-200 transition-colors"
        >
          <div className="w-14 h-14 bg-white/60 rounded-2xl flex items-center justify-center text-3xl mr-4 group-hover:scale-110 transition-transform">⚙️</div>
          <div className="text-left">
            <div className="font-bold text-lg text-slate-600 leading-none mb-1">관리자 로그인</div>
            <div className="text-[8px] font-bold text-slate-400 uppercase tracking-widest">HQ Control Center</div>
          </div>
        </button>
      </div>
    </div>
  );

  const renderSessionSelection = () => (
    <div className="flex flex-col h-full animate-slide-up p-6 overflow-y-auto no-scrollbar">
      <div className="iso-card p-7 flex-1 flex flex-col">
        <div className="mb-6">
          <p className="text-[8px] font-black uppercase tracking-[0.4em] text-emerald-600 mb-1">과정 선택</p>
          <h2 className="text-2xl font-black text-slate-900 tracking-tight leading-tight">참여할 세션을 선택하세요</h2>
        </div>
        <div className="flex-1 space-y-3 overflow-y-auto no-scrollbar">
          {availableSessions.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-16 text-center">
              <div className="w-20 h-20 bg-slate-100 rounded-[28px] flex items-center justify-center text-4xl mb-6">📭</div>
              <p className="text-slate-400 font-bold text-sm mb-2">진행 중인 세션이 없습니다</p>
              <p className="text-slate-300 text-xs">관리자가 과정을 개설할 때까지 기다려주세요</p>
            </div>
          ) : (
            availableSessions.map((session) => (
              <button
                key={session.id}
                onClick={() => handleSelectSession(session)}
                className="w-full iso-card p-5 flex items-center group border-2 border-transparent hover:border-emerald-500 transition-all"
              >
                <div className="w-12 h-12 bg-emerald-50 rounded-xl flex items-center justify-center text-2xl mr-4 group-hover:scale-110 transition-transform">🎯</div>
                <div className="text-left flex-1">
                  <div className="font-bold text-base text-slate-900 leading-tight mb-1">{session.sessionName}</div>
                  <div className="text-[10px] font-bold text-slate-400">{session.maxTeams}개 팀 운영</div>
                </div>
                <div className="w-3 h-3 bg-emerald-500 rounded-full animate-pulse" />
              </button>
            ))
          )}
        </div>
        <button onClick={() => { setRole(null); setStep(AppStep.SELECT_ROLE); }} className="w-full py-4 rounded-2xl font-bold text-sm text-slate-400 mt-6 hover:bg-slate-50 transition-colors">뒤로가기</button>
      </div>
    </div>
  );

  const renderAdminLogin = () => (
    <div className="flex flex-col h-full items-center justify-center px-8 animate-slide-up">
      <div className="w-full iso-card p-8">
        <h2 className="text-xl font-black text-slate-900 mb-6 tracking-tight">인증 단계</h2>
        <div className="space-y-5">
          <div className="space-y-2">
            <label className="text-[9px] font-bold text-slate-400 uppercase tracking-widest px-1">보안 키 입력</label>
            <input type="password" value={adminPassword} onChange={(e) => setAdminPassword(e.target.value)} placeholder="•••••••" className={`w-full bg-slate-50 rounded-2xl p-4 text-xl font-black focus:ring-8 focus:ring-emerald-500/5 focus:outline-none border-2 transition-all ${loginError ? 'border-red-400' : 'border-transparent'}`} />
          </div>
          <button onClick={handleAdminLogin} className="w-full iso-button iso-button-primary py-4 font-bold uppercase tracking-widest text-xs">관리자 인증</button>
        </div>
      </div>
    </div>
  );

  const renderTeamSelection = () => (
    <div className="flex flex-col h-full animate-slide-up p-6 overflow-y-auto no-scrollbar">
      <div className="iso-card p-7 flex-1 flex flex-col">
        <div className="mb-8">
          <p className="text-[8px] font-black uppercase tracking-[0.4em] text-emerald-600 mb-1">현재 세션</p>
          <h2 className="text-2xl font-black text-slate-900 tracking-tight leading-tight">{sessionName || '사우디 비전 2030 워크숍'}</h2>
        </div>
        <div className="space-y-6 flex-1">
          <div className="space-y-2">
            <label className="text-[10px] font-bold text-slate-400 uppercase tracking-widest px-1">식별 성함</label>
            <input type="text" value={studentName} onChange={(e) => setStudentName(e.target.value)} placeholder="성함을 입력해주세요" className="w-full bg-slate-50 border-2 border-transparent focus:border-emerald-500/30 rounded-2xl p-4 font-bold text-slate-900 focus:outline-none transition-all shadow-inner text-sm" />
          </div>
          <div className="space-y-3">
            <label className="text-[10px] font-bold text-slate-400 uppercase tracking-widest px-1">소속 팀(조) 선택</label>
            <div className="grid grid-cols-4 gap-2">
              {Array.from({ length: maxTeams }).map((_, i) => (
                <button key={i} onClick={() => setSelectedTeam(i + 1)} className={`aspect-square rounded-[18px] font-black text-base transition-all border-2 ${selectedTeam === i + 1 ? 'bg-emerald-500 border-emerald-600 text-white shadow-xl shadow-emerald-200 -translate-y-1' : 'bg-slate-50 border-transparent text-slate-300 hover:bg-slate-100'}`}>
                  {i + 1}조
                </button>
              ))}
            </div>
          </div>
        </div>
        <button disabled={!selectedTeam || !studentName} onClick={() => setStep(AppStep.INTRO)} className={`w-full py-5 rounded-2xl font-bold text-base uppercase tracking-widest transition-all mt-6 ${selectedTeam && studentName ? 'iso-button iso-button-primary' : 'bg-slate-100 text-slate-300 cursor-not-allowed shadow-none'}`}>미션 시작</button>
      </div>
    </div>
  );

  const renderIntro = () => (
    <div className="flex flex-col h-full animate-slide-up p-4">
      <div className="iso-card p-5 flex-1 flex flex-col overflow-y-auto no-scrollbar">
        <div className="flex items-center justify-between mb-4 border-b border-slate-50 pb-4">
          <h2 className="text-xl font-black text-slate-900 italic tracking-tight">사우디 TFT 입찰 정보</h2>
          <div className="bg-emerald-500 text-white px-2.5 py-1 rounded-full text-[8px] font-black shadow-lg">{selectedTeam}조</div>
        </div>
        <div className="mb-4 rounded-2xl overflow-hidden shadow-md border border-slate-100 shrink-0">
          <img src="https://i.ibb.co/LDsYtdfX/Infographic-3.jpg" alt="입찰 정보 인포그래픽" className="w-full h-auto" />
        </div>
        <div className="space-y-4">
          {MISSION_SLIDES.map((slide, idx) => (
            <div key={idx} className="flex gap-3 items-start group">
              <div className="w-10 h-10 bg-white rounded-lg flex items-center justify-center text-2xl shrink-0 shadow-md border border-slate-50">{slide.image}</div>
              <div className="pt-0.5">
                <h3 className="font-black text-slate-900 text-[13px] mb-0.5 tracking-tight">{slide.title}</h3>
                <p className="text-[10px] font-medium text-slate-500 leading-relaxed">{slide.content}</p>
              </div>
            </div>
          ))}
        </div>
        <div className="mt-5 py-2.5 px-4 bg-slate-900 rounded-[18px] shadow-lg relative overflow-hidden flex items-center justify-center">
          <p className="text-[13px] font-black text-white leading-tight relative z-10 text-center uppercase tracking-tight">입찰 수주를 위한 최적의 제안가를 찾아라!</p>
        </div>
      </div>
      <NavigationBar nextLabel="경쟁사 분석하기" showInfoBanner={false} />
    </div>
  );

  const renderAnalysis = () => (
    <div className="flex flex-col h-full animate-slide-up p-4">
      <div className="iso-card p-5 flex-1 overflow-y-auto no-scrollbar">
        <div className="mb-5 flex items-center gap-2">
           <div className="w-8 h-8 bg-slate-900 rounded-lg flex items-center justify-center text-lg shadow-lg">🛰️</div>
           <h2 className="text-lg font-black text-slate-900 tracking-tight">국가별 특징 & 정보분석</h2>
        </div>
        <div className="space-y-4">
          {COMPETITOR_DETAILS.map(comp => (
            <div key={comp.country} className="p-4 bg-white rounded-[24px] border border-slate-100 shadow-sm relative overflow-hidden group">
              <div className="absolute top-3 right-3 w-11 h-11 rounded-full overflow-hidden shadow-md"><img src={getCountryIcon(comp.country)} alt="" className="w-full h-full object-cover" /></div>
              <div className="mb-3">
                <span className="font-black text-slate-900 text-xl tracking-tight leading-none">{getCountryDisplayName(comp.country)}</span>
              </div>
              <div className="space-y-3 relative z-10">
                <div className="flex gap-2">
                   <div className="w-1 h-auto bg-emerald-500 rounded-full shadow-sm" />
                   <div className="flex-1">
                     <p className="text-[9px] font-black text-emerald-600 uppercase mb-0.5 tracking-widest">강점 (STRENGTH)</p>
                     <p className="text-[13px] font-bold text-slate-800 leading-tight">{comp.strength}</p>
                   </div>
                </div>
                <div className="flex gap-2">
                   <div className="w-1 h-auto bg-red-400 rounded-full shadow-sm" />
                   <div className="flex-1">
                     <p className="text-[9px] font-black text-red-600 uppercase mb-0.5 tracking-widest">약점 (WEAKNESS)</p>
                     <p className="text-[13px] font-bold text-slate-800 leading-tight">{comp.weakness}</p>
                   </div>
                </div>
              </div>
            </div>
          ))}
        </div>
      </div>
      <NavigationBar nextLabel="정보 기록하기" />
    </div>
  );

  const renderRecords = () => (
    <div className="flex flex-col h-full animate-slide-up p-4">
      <div className="iso-card p-5 flex-1 flex flex-col overflow-hidden">
        <div className="mb-4 flex items-center justify-between">
           <div className="flex items-center gap-2">
             <div className="w-8 h-8 bg-emerald-500 rounded-lg flex items-center justify-center text-lg shadow-lg shadow-emerald-100">📝</div>
             <h2 className="text-lg font-black text-slate-900 tracking-tight">추가 정보 기록</h2>
           </div>
           <div className="flex items-center gap-1.5 px-2 py-1 bg-slate-50 rounded-full border border-slate-100">
             <div className={`w-1.5 h-1.5 rounded-full ${isSyncing ? 'bg-amber-400 animate-pulse' : 'bg-emerald-400'}`} />
             <span className="text-[7px] font-black text-slate-400 uppercase tracking-widest">{isSyncing ? '동기화 중...' : '실시간 공유됨'}</span>
           </div>
        </div>
        <div className="flex-1 overflow-y-auto no-scrollbar pb-2">
          <p className="text-[9px] font-black text-slate-400 uppercase tracking-[0.2em] px-1 mb-3">확보 정보 및 전략 메모</p>
          <div className="space-y-3">
            {notes.map((note, idx) => (
              <div key={idx} className="relative group animate-in fade-in slide-in-from-bottom-2 duration-300">
                <div className="iso-card bg-slate-50 border-slate-100 p-3 focus-within:bg-white focus-within:border-emerald-500/30 transition-all focus-within:shadow-xl focus-within:shadow-emerald-50 relative">
                  <textarea value={note} onChange={(e) => handleNoteChange(idx, e.target.value)} placeholder={idx === notes.length - 1 ? "타팀에서 확보한 추가 정보를 기록하세요" : "전략 기록..."} rows={1} className="w-full bg-transparent font-bold text-[11px] text-slate-700 focus:outline-none resize-none leading-relaxed overflow-hidden" />
                  {idx < notes.length - 1 && note.trim() !== '' && <button onClick={() => removeNote(idx)} className="absolute top-2 right-2 w-5 h-5 rounded-full bg-slate-100 text-slate-400 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-all hover:bg-red-50 hover:text-red-500"><span className="text-xs">&times;</span></button>}
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>
      <NavigationBar nextLabel="제안가 제출" />
    </div>
  );

  const renderSimulation = () => {
    // If admin revealed results, go to result screen regardless of submission status
    if (isResultsRevealed) {
      setTimeout(() => setStep(AppStep.RESULT), 100);
      return null;
    }

    if (hasSubmitted && !isResultsRevealed) {
      return (
        <div className="flex flex-col h-full animate-slide-up p-6 items-center justify-center text-center">
          <div className="w-24 h-24 bg-slate-900 rounded-[32px] flex items-center justify-center text-5xl mb-8 animate-bounce shadow-2xl shadow-slate-200">📡</div>
          <h2 className="text-2xl font-black text-slate-900 mb-4 tracking-tight">제안서 제출 완료</h2>
          <p className="text-slate-400 font-bold leading-relaxed mb-10 px-6">모든 팀의 제안서가 수합될 때까지 대기해 주세요.<br/>본부에서 최종 결과를 곧 공개합니다.</p>
          <div className="flex items-center gap-3 px-6 py-3 bg-emerald-50 rounded-full border border-emerald-100 animate-pulse">
             <div className="w-2 h-2 bg-emerald-500 rounded-full" />
             <span className="text-[10px] font-black text-emerald-600 uppercase tracking-widest">본부 승인 대기 중</span>
          </div>
        </div>
      );
    }

    return (
      <div className="flex flex-col h-full animate-slide-up p-4">
        <div className="iso-card p-4 flex-1 overflow-y-auto no-scrollbar">
          <div className="mb-4 flex items-center gap-2">
             <div className="w-8 h-8 bg-emerald-500 rounded-lg flex items-center justify-center text-lg shadow-lg">🎯</div>
             <h2 className="text-lg font-black text-slate-900 tracking-tight">최종 제안서 작성</h2>
          </div>
          <div className="space-y-4">
            <div className="bg-slate-50 rounded-[20px] p-4 border border-slate-100">
              <div className="space-y-3">
                <div className="space-y-1">
                  <label className="text-[9px] font-black text-slate-400 uppercase tracking-widest px-1">최종 제안가 (백만 달러)</label>
                  <input type="number" value={userPrice} onChange={(e) => setUserPrice(e.target.value)} placeholder="" className="w-full bg-white border-2 border-transparent focus:border-emerald-500/30 rounded-xl p-3 font-black text-slate-900 focus:outline-none transition-all shadow-sm text-xl" />
                </div>
                <div className="space-y-1">
                  <label className="text-[9px] font-black text-slate-400 uppercase tracking-widest px-1">예상 이익 (백만 달러)</label>
                  <input type="number" value={expectedProfit} onChange={(e) => setExpectedProfit(e.target.value)} placeholder="" className="w-full bg-white border-2 border-transparent focus:border-emerald-500/30 rounded-xl p-3 font-black text-emerald-600 focus:outline-none transition-all shadow-sm text-xl" />
                </div>
              </div>
            </div>
            <div className="space-y-2">
              <p className="text-[9px] font-black text-slate-400 uppercase tracking-widest px-1">국가별 입찰 최종 점수 기록</p>
              <div className="grid grid-cols-2 gap-2">
                {(['USA', 'Germany', 'China', 'Korea'] as const).map(country => (
                  <div key={country} className="flex items-center gap-1.5 bg-white p-2.5 rounded-[16px] border border-slate-100 shadow-sm">
                    <div className="w-6 h-6 rounded-full overflow-hidden shrink-0"><img src={getCountryIcon(country)} alt="" className="w-full h-full object-cover" /></div>
                    <span className="font-black text-slate-900 text-[11px] tracking-tight flex-1">{getCountryDisplayName(country)}</span>
                    <div className="flex items-center gap-0.5">
                      <input type="number" value={manualScores[country]} onChange={(e) => setManualScores(prev => ({ ...prev, [country]: e.target.value }))} placeholder="" className="w-12 bg-slate-50 border-transparent rounded-lg p-2 text-right font-black text-slate-900 text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500/20 transition-all" />
                      <span className="text-[10px] font-bold text-slate-400">점</span>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </div>
        <NavigationBar nextLabel="제안서 최종 제출" />
      </div>
    );
  };

  const renderResult = () => {
    const isPriceCorrect = Number(userPrice) === CORRECT_ANSWERS.userPrice;
    const isProfitCorrect = Number(expectedProfit) === CORRECT_ANSWERS.expectedProfit;
    const won = isPriceCorrect && isProfitCorrect;

    return (
      <div className="flex flex-col h-full animate-slide-up p-6 overflow-y-auto no-scrollbar">
        <div className="pb-20">
          <div className="iso-card p-8 text-center mb-8 bg-white relative overflow-hidden">
            <div className={`absolute top-0 left-0 w-full h-2 ${won ? 'bg-emerald-500 glow-emerald' : 'bg-red-400 shadow-lg shadow-red-100'}`} />
            <div className="text-8xl mb-10 inline-block animate-float">{won ? '🏆' : '📉'}</div>
            <h2 className="text-3xl font-black text-slate-900 mb-4 tracking-tighter leading-none">{won ? '수주 성공!' : '수주 실패'}</h2>
            
            <div className="grid grid-cols-2 gap-2 mb-8">
              <div className="bg-slate-50 p-3 rounded-2xl">
                <p className="text-[8px] font-black text-slate-400 uppercase mb-1">나의 제안가</p>
                <p className={`text-sm font-black ${isPriceCorrect ? 'text-emerald-600' : 'text-red-500'}`}>{userPrice || 0}M</p>
              </div>
              <div className="bg-emerald-50 p-3 rounded-2xl border border-emerald-100">
                <p className="text-[8px] font-black text-emerald-400 uppercase mb-1">정답 제안가</p>
                <p className="text-sm font-black text-emerald-700">{CORRECT_ANSWERS.userPrice}M</p>
              </div>
              <div className="bg-slate-50 p-3 rounded-2xl">
                <p className="text-[8px] font-black text-slate-400 uppercase mb-1">나의 예상수익</p>
                <p className={`text-sm font-black ${isProfitCorrect ? 'text-emerald-600' : 'text-red-500'}`}>{expectedProfit || 0}M</p>
              </div>
              <div className="bg-emerald-50 p-3 rounded-2xl border border-emerald-100">
                <p className="text-[8px] font-black text-emerald-400 uppercase mb-1">정답 예상수익</p>
                <p className="text-sm font-black text-emerald-700">{CORRECT_ANSWERS.expectedProfit}M</p>
              </div>
            </div>

            <div className="text-left bg-slate-50 rounded-[32px] p-7 relative border border-slate-50 mb-6">
              <p className="text-[9px] font-black text-slate-400 uppercase tracking-widest mb-4">국가별 최종 점수 (입력 / 정답)</p>
              <div className="space-y-3">
                {Object.entries(CORRECT_ANSWERS.scores).map(([country, correctScore]) => {
                  const userScore = manualScores[country] || '0';
                  const isScoreCorrect = Number(userScore) === correctScore;
                  return (
                    <div key={country} className="flex justify-between items-center text-[11px]">
                      <span className="font-bold text-slate-600">{getCountryDisplayName(country)}</span>
                      <div className="flex gap-2 items-center">
                        <span className={`font-black ${isScoreCorrect ? 'text-emerald-600' : 'text-red-500'}`}>{userScore}</span>
                        <span className="text-slate-300 font-normal">/</span>
                        <span className="font-black text-slate-900">{correctScore}점</span>
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>

            <div className="text-left bg-slate-900 rounded-[32px] p-7 relative">
              <div className="flex items-center gap-2 mb-4">
                 <div className={`w-2 h-2 rounded-full ${won ? 'bg-emerald-500 animate-pulse' : 'bg-slate-400'}`} />
                 <span className="text-[9px] font-black text-white/40 uppercase tracking-widest leading-none">CEO 총평</span>
              </div>
              {loading ? (
                <div className="space-y-2 animate-pulse"><div className="h-3 bg-white/10 rounded-full w-full" /><div className="h-3 bg-white/10 rounded-full w-4/5" /></div>
              ) : (
                <p className="text-white font-bold text-[13px] leading-relaxed italic">"{ceoFeedback}"</p>
              )}
            </div>
          </div>
          
          <button onClick={() => { setHasSubmitted(false); setIsResultsRevealed(false); setStep(AppStep.SIMULATION); }} className="w-full iso-button iso-button-primary py-5 rounded-[22px] font-black text-lg mb-4">다시 시도하기</button>
          <button onClick={() => { setRole(null); setStep(AppStep.SELECT_ROLE); }} className="w-full bg-slate-100 py-3 rounded-[22px] font-black text-[9px] text-slate-300 uppercase tracking-widest">초기화면으로</button>
        </div>
      </div>
    );
  };

  const renderAdminDashboard = () => (
    <div className="grid grid-cols-1 xl:grid-cols-3 gap-10 animate-in fade-in slide-in-from-bottom-4 duration-500">
      <div className="xl:col-span-2 space-y-10">
        {/* 새 세션 생성 */}
        <div className="iso-card p-12 bg-white relative overflow-hidden">
          <div className="absolute top-0 left-0 w-full h-2 bg-emerald-500" />
          <h3 className="font-black text-2xl text-slate-900 mb-10 tracking-tight flex items-center gap-3">
             <span className="w-10 h-10 bg-emerald-50 rounded-xl flex items-center justify-center text-lg">➕</span>
             새 과정 개설
          </h3>
          <div className="space-y-6">
            <div className="space-y-3">
              <label className="text-[11px] font-bold text-slate-400 uppercase tracking-widest px-1">세션 이름</label>
              <input type="text" value={newSessionName} onChange={(e) => setNewSessionName(e.target.value)} placeholder="예) 삼성전자 신입사원 과정" className="w-full bg-slate-50 rounded-[24px] p-6 text-2xl font-black text-slate-900 border-2 border-transparent focus:border-emerald-500/20 transition-all outline-none" />
            </div>
            <div className="flex gap-4">
              <select value={newSessionTeams} onChange={(e) => setNewSessionTeams(Number(e.target.value))} className="flex-1 bg-slate-50 rounded-[24px] p-5 text-xl font-black text-slate-900 border-2 border-transparent outline-none appearance-none">{[...Array(24)].map((_, i) => <option key={i} value={i + 1}>{i + 1}개 팀 운영</option>)}</select>
              <button onClick={handleCreateSession} disabled={!newSessionName.trim()} className={`flex-[2] py-5 rounded-[24px] font-black uppercase tracking-widest transition-all ${newSessionName.trim() ? 'bg-emerald-500 text-white shadow-lg shadow-emerald-100 hover:bg-emerald-600' : 'bg-slate-100 text-slate-300 cursor-not-allowed'}`}>과정 개설하기</button>
            </div>
          </div>
        </div>

        {/* 세션 목록 */}
        <div className="iso-card p-12">
          <h3 className="font-black text-xl text-slate-900 mb-8 tracking-tight flex items-center gap-3">
            <span className="w-8 h-8 bg-slate-100 rounded-lg flex items-center justify-center text-base">📋</span>
            개설된 과정 목록
          </h3>
          <div className="space-y-4 max-h-[400px] overflow-y-auto no-scrollbar">
            {allSessions.length === 0 ? (
              <div className="text-center py-12 text-slate-400">
                <p className="text-lg font-bold mb-2">개설된 과정이 없습니다</p>
                <p className="text-sm">위에서 새 과정을 개설해주세요</p>
              </div>
            ) : (
              allSessions.map((session) => (
                <div
                  key={session.id}
                  className={`p-6 rounded-[24px] border-2 transition-all cursor-pointer ${currentSessionId === session.id ? 'bg-emerald-50 border-emerald-300 shadow-lg' : 'bg-slate-50 border-transparent hover:border-slate-200'}`}
                  onClick={() => handleSelectSession(session)}
                >
                  <div className="flex items-center justify-between mb-3">
                    <h4 className="font-black text-lg text-slate-900">{session.sessionName}</h4>
                    <div className="flex items-center gap-2">
                      {session.isSessionActive ? (
                        <span className="px-3 py-1 bg-emerald-500 text-white text-[10px] font-black rounded-full">진행중</span>
                      ) : (
                        <span className="px-3 py-1 bg-slate-300 text-white text-[10px] font-black rounded-full">대기</span>
                      )}
                      {currentSessionId === session.id && (
                        <span className="px-3 py-1 bg-blue-500 text-white text-[10px] font-black rounded-full">선택됨</span>
                      )}
                    </div>
                  </div>
                  <p className="text-sm font-bold text-slate-400">{session.maxTeams}개 팀 운영</p>
                </div>
              ))
            )}
          </div>
        </div>

        {/* 선택된 세션 컨트롤 */}
        {currentSessionId && (
          <div className="iso-card p-12 bg-white relative overflow-hidden">
            <div className="absolute top-0 left-0 w-full h-2 bg-slate-900" />
            <h3 className="font-black text-2xl text-slate-900 mb-6 tracking-tight flex items-center gap-3">
               <span className="w-10 h-10 bg-slate-50 rounded-xl flex items-center justify-center text-lg">📢</span>
               세션 컨트롤: {sessionName}
            </h3>
            <div className="grid grid-cols-2 gap-6 mb-8">
              <button onClick={triggerReveal} disabled={isResultsRevealed} className={`flex flex-col items-center justify-center p-8 rounded-[32px] transition-all border-4 ${isResultsRevealed ? 'bg-slate-50 border-slate-100 cursor-not-allowed opacity-50' : 'bg-emerald-500 border-emerald-600 text-white shadow-2xl shadow-emerald-200 hover:scale-105 active:scale-95'}`}>
                 <span className="text-4xl mb-3">🏁</span>
                 <span className="text-lg font-black">결과 공개</span>
              </button>
              <button onClick={triggerReset} className="flex flex-col items-center justify-center p-8 rounded-[32px] bg-white border-4 border-slate-100 text-slate-900 hover:bg-red-50 hover:border-red-100 hover:text-red-500 transition-all">
                 <span className="text-4xl mb-3">🔄</span>
                 <span className="text-lg font-black">초기화</span>
              </button>
            </div>
            <div className="flex gap-4">
              <button onClick={() => { const newVal = !isSessionActive; setIsSessionActive(newVal); updateSessionState(currentSessionId, { isSessionActive: newVal }); }} className={`flex-1 py-4 rounded-[20px] font-black transition-all ${isSessionActive ? 'bg-red-50 text-red-500 border-2 border-red-100' : 'bg-emerald-500 text-white shadow-lg shadow-emerald-100'}`}>{isSessionActive ? '세션 중지' : '세션 시작'}</button>
            </div>
          </div>
        )}
      </div>

      <div className="space-y-10">
        <div className="bg-slate-900 rounded-[44px] shadow-2xl p-12 text-white relative overflow-hidden">
          <h3 className="font-black text-2xl mb-10 text-emerald-400 tracking-tight">시스템 로그</h3>
          <div className="space-y-4 text-xs font-mono opacity-60">
            <p className="flex gap-3"><span className="text-emerald-500">[INFO]</span> 시스템 활성화 완료.</p>
            {currentSessionId && <p className="flex gap-3 text-blue-400"><span>[SESSION]</span> {sessionName} 선택됨</p>}
            {isResultsRevealed && <p className="flex gap-3 text-emerald-400 font-bold"><span>[BROADCAST]</span> 결과 공개됨</p>}
            <p className="flex gap-3"><span className="text-slate-500">[STATUS]</span> {allSessions.length}개 세션 운영 중</p>
          </div>
        </div>
        {currentSessionId && (
          <div className="iso-card p-12 flex flex-col items-center text-center">
             <div className="w-20 h-20 bg-emerald-50 rounded-[28px] flex items-center justify-center text-4xl mb-6 shadow-lg shadow-emerald-50">📝</div>
             <h3 className="font-black text-xl text-slate-900 mb-2">제출 완료</h3>
             <p className="text-5xl font-black text-emerald-500">{Object.keys(teamSubmissions).length}</p>
             <p className="text-sm font-bold text-slate-400 mt-2">/ {maxTeams}팀</p>
          </div>
        )}
      </div>
    </div>
  );

  const renderAdminSubmissions = () => (
    <div className="animate-in fade-in slide-in-from-bottom-4 duration-500">
      <div className="iso-card p-12 bg-white relative overflow-hidden">
        <div className="absolute top-0 left-0 w-full h-2 bg-emerald-500" />
        <div className="flex items-center justify-between mb-10">
          <h3 className="font-black text-2xl text-slate-900 tracking-tight flex items-center gap-3">
            <span className="w-10 h-10 bg-emerald-50 rounded-xl flex items-center justify-center text-lg">📊</span>
            팀별 제출 현황
          </h3>
          <div className="flex items-center gap-4">
            <span className="text-lg font-bold text-emerald-500">{Object.keys(teamSubmissions).length} / {maxTeams}팀 제출</span>
            <div className={`px-4 py-2 rounded-full text-sm font-black ${Object.keys(teamSubmissions).length === maxTeams ? 'bg-emerald-500 text-white' : 'bg-slate-100 text-slate-400'}`}>
              {Object.keys(teamSubmissions).length === maxTeams ? '✓ 전원 제출 완료' : '제출 대기 중...'}
            </div>
          </div>
        </div>
        <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 xl:grid-cols-6 gap-4">
          {Array.from({ length: maxTeams }).map((_, i) => {
            const teamNum = i + 1;
            const submission = teamSubmissions[teamNum];
            return (
              <div key={teamNum} className={`p-5 rounded-[24px] border-2 transition-all ${submission ? 'bg-emerald-50 border-emerald-200 shadow-lg shadow-emerald-100/50' : 'bg-slate-50 border-slate-100'}`}>
                <div className="flex items-center justify-between mb-3">
                  <span className="font-black text-xl text-slate-900">{teamNum}조</span>
                  {submission ? (
                    <span className="w-4 h-4 bg-emerald-500 rounded-full animate-pulse" />
                  ) : (
                    <span className="w-4 h-4 bg-slate-300 rounded-full" />
                  )}
                </div>
                {submission ? (
                  <div className="space-y-2">
                    <p className="text-xs font-bold text-slate-500 truncate">{submission.name}</p>
                    <p className="text-xl font-black text-emerald-600">${submission.price}M</p>
                    <p className="text-xs font-bold text-slate-400">예상수익: ${submission.profit}M</p>
                    {submission.scores && (
                      <div className="pt-2 mt-2 border-t border-emerald-200 space-y-1">
                        <p className="text-[9px] font-black text-slate-400 uppercase">국가별 점수</p>
                        <div className="grid grid-cols-2 gap-1 text-[10px]">
                          <span className="text-slate-500">🇺🇸 {submission.scores.USA || '-'}</span>
                          <span className="text-slate-500">🇩🇪 {submission.scores.Germany || '-'}</span>
                          <span className="text-slate-500">🇨🇳 {submission.scores.China || '-'}</span>
                          <span className="text-slate-500">🇰🇷 {submission.scores.Korea || '-'}</span>
                        </div>
                      </div>
                    )}
                  </div>
                ) : (
                  <div className="py-4">
                    <p className="text-sm font-bold text-slate-400">대기 중...</p>
                  </div>
                )}
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );

  const renderAdmin = () => (
    <div className="flex h-screen bg-slate-50 animate-in fade-in duration-700">
      <aside className="w-80 bg-white p-12 hidden lg:flex flex-col border-r border-slate-200/60 shadow-sm">
        <div className="mb-14 flex items-center gap-4">
          <div className="w-12 h-12 bg-saudi-green rounded-2xl flex items-center justify-center text-2xl shadow-xl shadow-emerald-100">🇸🇦</div>
          <h1 className="text-xl font-black text-slate-900 tracking-tight">사우디 관리자 모드</h1>
        </div>
        <nav className="space-y-3 flex-1">
          <button onClick={() => setAdminSubView('dashboard')} className={`w-full text-left p-5 rounded-[20px] font-black text-sm tracking-tight border transition-all flex items-center gap-3 ${adminSubView === 'dashboard' ? 'bg-emerald-50 text-emerald-600 border-emerald-100/50' : 'text-slate-400 border-transparent hover:bg-slate-50'}`}>
            <span className="text-lg">⚙️</span>
            <span>과정 개설</span>
          </button>
          <button onClick={() => setAdminSubView('submissions')} className={`w-full text-left p-5 rounded-[20px] font-black text-sm tracking-tight border transition-all flex items-center gap-3 ${adminSubView === 'submissions' ? 'bg-emerald-50 text-emerald-600 border-emerald-100/50' : 'text-slate-400 border-transparent hover:bg-slate-50'}`}>
            <span className="text-lg">📊</span>
            <span>팀별 제출 현황</span>
            {Object.keys(teamSubmissions).length > 0 && (
              <span className="ml-auto bg-emerald-500 text-white text-[10px] font-black px-2 py-0.5 rounded-full">{Object.keys(teamSubmissions).length}</span>
            )}
          </button>
          <div className="border-t border-slate-100 pt-4 mt-4">
            <button
              onClick={() => { setRole('USER'); setStep(AppStep.TEAM_SELECTION); }}
              className="w-full text-left p-5 hover:bg-slate-50 text-slate-400 rounded-[20px] font-black text-sm tracking-tight flex items-center gap-3 transition-colors"
            >
              <span className="text-lg">📱</span>
              <span>학습자 모드 전환</span>
            </button>
          </div>
        </nav>
        <button onClick={() => { setRole(null); setStep(AppStep.SELECT_ROLE); }} className="w-full text-left p-5 text-red-400 font-black text-sm">로그아웃</button>
      </aside>
      <main className="flex-1 p-16 overflow-y-auto no-scrollbar">
        <header className="mb-16 flex justify-between items-end">
          <div>
            <h2 className="text-5xl font-black text-slate-900 tracking-tighter mb-3">
              {adminSubView === 'dashboard' ? '과정 개설' : '팀별 제출 현황'}
            </h2>
            <p className="text-slate-400 font-bold text-sm uppercase tracking-widest">
              {adminSubView === 'dashboard' ? 'Session Setup & Control' : 'Real-time Team Submissions'}
            </p>
          </div>
        </header>
        {adminSubView === 'dashboard' && renderAdminDashboard()}
        {adminSubView === 'submissions' && renderAdminSubmissions()}
      </main>
    </div>
  );

  if (step === AppStep.SELECT_ROLE) return <div className="min-h-screen flex items-center justify-center sm:p-6"><div className="mobile-frame animate-slide-up">{renderRoleSelection()}</div></div>;
  if (step === AppStep.ADMIN_LOGIN) return <div className="min-h-screen flex items-center justify-center sm:p-6"><div className="mobile-frame animate-slide-up">{renderAdminLogin()}</div></div>;
  if (step === AppStep.SESSION_SELECTION) return <div className="min-h-screen flex items-center justify-center sm:p-6"><div className="mobile-frame animate-slide-up">{renderSessionSelection()}</div></div>;

  return (
    <div className="min-h-screen">
      {role === 'USER' ? (
        <div className="flex flex-col items-center justify-center min-h-screen sm:p-6">
          <div className="mobile-frame animate-slide-up">
            <div className="flex items-center justify-between mt-6 mb-4 mx-6 px-4 py-3 bg-white/80 backdrop-blur-xl rounded-[24px] border border-white/50 shadow-xl shadow-slate-200/50 shrink-0 z-10">
              <div className="flex items-center gap-3">
                <button onClick={() => { setRole(null); setStep(AppStep.SELECT_ROLE); }} className="w-9 h-9 bg-emerald-500 rounded-lg flex items-center justify-center text-sm shadow-xl shadow-emerald-200 transition-all hover:scale-110">🇸🇦</button>
                <div className="flex flex-col">
                  <span className="text-[11px] font-black uppercase tracking-tight text-slate-900 leading-none">Saudi TFT Mission</span>
                  <span className="text-[8px] font-bold uppercase tracking-widest text-slate-400 mt-0.5">Vision 2030</span>
                </div>
              </div>
              <div className="flex items-center gap-2">
                {studentName && <span className="text-[8px] font-black bg-emerald-100 text-emerald-600 px-3 py-1 rounded-full">{studentName}</span>}
                <button onClick={() => { setRole('ADMIN'); setStep(AppStep.ADMIN_LOGIN); }} className="bg-slate-900 text-white text-[9px] font-black px-4 py-2 rounded-full shadow-lg shadow-slate-200">관리자</button>
              </div>
            </div>
            {step !== AppStep.TEAM_SELECTION && step !== AppStep.RESULT && <div className="px-4"><StepIndicator currentStep={step} /></div>}
            <div className="flex-1 overflow-hidden relative">
              {step === AppStep.TEAM_SELECTION && renderTeamSelection()}
              {step === AppStep.INTRO && renderIntro()}
              {step === AppStep.ANALYSIS && renderAnalysis()}
              {step === AppStep.RECORDS && renderRecords()}
              {step === AppStep.SIMULATION && renderSimulation()}
              {step === AppStep.RESULT && renderResult()}
            </div>
            {renderInfoCardModal()}
          </div>
        </div>
      ) : renderAdmin()}
    </div>
  );
};

export default App;
