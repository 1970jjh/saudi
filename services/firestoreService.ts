import { db } from '../firebase';
import {
  doc,
  setDoc,
  getDoc,
  onSnapshot,
  collection,
  query,
  where,
  deleteDoc,
  serverTimestamp,
  Timestamp,
  orderBy
} from 'firebase/firestore';

// 세션 상태 타입
export interface SessionState {
  id: string;
  sessionName: string;
  maxTeams: number;
  isSessionActive: boolean;
  isResultsRevealed: boolean;
  createdAt: Timestamp;
  updatedAt: Timestamp;
  // Timer fields
  timerDuration?: number; // total seconds
  timerEndTime?: number; // timestamp when timer ends
  timerStatus?: 'stopped' | 'running' | 'paused';
  timerPausedRemaining?: number; // remaining seconds when paused
}

// 팀 제출 타입
export interface TeamSubmission {
  name: string;
  price: string;
  profit: string;
  scores: {
    USA: string;
    Germany: string;
    China: string;
    Korea: string;
  };
  timestamp: number;
}

// 팀 노트 타입
export interface TeamNotes {
  notes: string[];
  updatedAt: Timestamp;
}

// 새 세션 생성
export const createSession = async (sessionName: string, maxTeams: number): Promise<string> => {
  const sessionId = `session_${Date.now()}`;
  const sessionRef = doc(db, 'sessions', sessionId);
  await setDoc(sessionRef, {
    id: sessionId,
    sessionName,
    maxTeams,
    isSessionActive: true,
    isResultsRevealed: false,
    createdAt: serverTimestamp(),
    updatedAt: serverTimestamp()
  });
  return sessionId;
};

// 세션 상태 업데이트
export const updateSessionState = async (sessionId: string, state: Partial<SessionState>) => {
  const sessionRef = doc(db, 'sessions', sessionId);
  await setDoc(sessionRef, {
    ...state,
    updatedAt: serverTimestamp()
  }, { merge: true });
};

// 단일 세션 구독
export const subscribeToSession = (sessionId: string, callback: (state: SessionState | null) => void) => {
  const sessionRef = doc(db, 'sessions', sessionId);
  return onSnapshot(sessionRef, (snapshot) => {
    if (snapshot.exists()) {
      callback({ id: snapshot.id, ...snapshot.data() } as SessionState);
    } else {
      callback(null);
    }
  });
};

// 활성 세션 목록 구독 (학습자용)
export const subscribeToActiveSessions = (callback: (sessions: SessionState[]) => void) => {
  const sessionsRef = collection(db, 'sessions');
  const q = query(sessionsRef, where('isSessionActive', '==', true), orderBy('createdAt', 'desc'));
  return onSnapshot(q, (snapshot) => {
    const sessions: SessionState[] = [];
    snapshot.forEach((doc) => {
      sessions.push({ id: doc.id, ...doc.data() } as SessionState);
    });
    callback(sessions);
  });
};

// 모든 세션 목록 구독 (관리자용)
export const subscribeToAllSessions = (callback: (sessions: SessionState[]) => void) => {
  const sessionsRef = collection(db, 'sessions');
  const q = query(sessionsRef, orderBy('createdAt', 'desc'));
  return onSnapshot(q, (snapshot) => {
    const sessions: SessionState[] = [];
    snapshot.forEach((doc) => {
      sessions.push({ id: doc.id, ...doc.data() } as SessionState);
    });
    callback(sessions);
  });
};

// 결과 공개
export const revealResults = async (sessionId: string) => {
  await updateSessionState(sessionId, { isResultsRevealed: true });
};

// 세션 리셋 (결과만 리셋)
export const resetSessionResults = async (sessionId: string) => {
  await updateSessionState(sessionId, { isResultsRevealed: false });
};

// 세션 삭제
export const deleteSession = async (sessionId: string) => {
  const sessionRef = doc(db, 'sessions', sessionId);
  await deleteDoc(sessionRef);
};

// 팀 제출 저장 (세션별)
export const submitTeamResult = async (
  sessionId: string,
  teamNumber: number,
  submission: Omit<TeamSubmission, 'timestamp'>
) => {
  const submissionRef = doc(db, 'sessions', sessionId, 'submissions', `team_${teamNumber}`);
  await setDoc(submissionRef, {
    ...submission,
    timestamp: Date.now()
  });
};

// 팀 제출 현황 실시간 구독 (세션별)
export const subscribeToSubmissions = (
  sessionId: string,
  callback: (submissions: Record<number, TeamSubmission>) => void
) => {
  const submissionsRef = collection(db, 'sessions', sessionId, 'submissions');
  return onSnapshot(submissionsRef, (snapshot) => {
    const submissions: Record<number, TeamSubmission> = {};
    snapshot.forEach((doc) => {
      const teamNumber = parseInt(doc.id.replace('team_', ''));
      if (!isNaN(teamNumber)) {
        submissions[teamNumber] = doc.data() as TeamSubmission;
      }
    });
    callback(submissions);
  });
};

// 팀 제출 전체 삭제 (세션 리셋 시)
export const clearAllSubmissions = async (sessionId: string, maxTeams: number) => {
  for (let i = 1; i <= maxTeams; i++) {
    const submissionRef = doc(db, 'sessions', sessionId, 'submissions', `team_${i}`);
    try {
      await deleteDoc(submissionRef);
    } catch (e) {
      // 문서가 없으면 무시
    }
  }
};

// 팀 노트 저장 (세션별)
export const saveTeamNotes = async (sessionId: string, teamNumber: number, notes: string[]) => {
  const notesRef = doc(db, 'sessions', sessionId, 'teamNotes', `team_${teamNumber}`);
  await setDoc(notesRef, {
    notes,
    updatedAt: serverTimestamp()
  });
};

// 팀 노트 실시간 구독 (세션별)
export const subscribeToTeamNotes = (
  sessionId: string,
  teamNumber: number,
  callback: (notes: string[]) => void
) => {
  const notesRef = doc(db, 'sessions', sessionId, 'teamNotes', `team_${teamNumber}`);
  return onSnapshot(notesRef, (snapshot) => {
    if (snapshot.exists()) {
      const data = snapshot.data() as TeamNotes;
      callback(data.notes);
    } else {
      callback(['']);
    }
  });
};

// 타이머 시작
export const startTimer = async (sessionId: string, durationSeconds: number) => {
  const endTime = Date.now() + durationSeconds * 1000;
  const sessionRef = doc(db, 'sessions', sessionId);
  await setDoc(sessionRef, {
    timerDuration: durationSeconds,
    timerEndTime: endTime,
    timerStatus: 'running',
    timerPausedRemaining: null,
    updatedAt: serverTimestamp()
  }, { merge: true });
};

// 타이머 일시정지
export const pauseTimer = async (sessionId: string, remainingSeconds: number) => {
  const sessionRef = doc(db, 'sessions', sessionId);
  await setDoc(sessionRef, {
    timerStatus: 'paused',
    timerPausedRemaining: remainingSeconds,
    timerEndTime: null,
    updatedAt: serverTimestamp()
  }, { merge: true });
};

// 타이머 재개
export const resumeTimer = async (sessionId: string, remainingSeconds: number) => {
  const endTime = Date.now() + remainingSeconds * 1000;
  const sessionRef = doc(db, 'sessions', sessionId);
  await setDoc(sessionRef, {
    timerEndTime: endTime,
    timerStatus: 'running',
    timerPausedRemaining: null,
    updatedAt: serverTimestamp()
  }, { merge: true });
};

// 타이머 종료
export const stopTimer = async (sessionId: string) => {
  const sessionRef = doc(db, 'sessions', sessionId);
  await setDoc(sessionRef, {
    timerStatus: 'stopped',
    timerEndTime: null,
    timerPausedRemaining: null,
    updatedAt: serverTimestamp()
  }, { merge: true });
};
