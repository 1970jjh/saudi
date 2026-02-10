import { db } from '../firebase';
import {
  doc,
  setDoc,
  onSnapshot,
  collection,
  updateDoc,
  deleteDoc,
  serverTimestamp,
  Timestamp
} from 'firebase/firestore';

// 세션 상태 타입
export interface SessionState {
  isResultsRevealed: boolean;
  sessionName: string;
  maxTeams: number;
  isSessionActive: boolean;
  updatedAt: Timestamp;
}

// 팀 제출 타입
export interface TeamSubmission {
  name: string;
  price: string;
  profit: string;
  timestamp: number;
}

// 팀 노트 타입
export interface TeamNotes {
  notes: string[];
  updatedAt: Timestamp;
}

// 세션 문서 ID (단일 세션용)
const SESSION_DOC_ID = 'current_session';

// 세션 상태 업데이트
export const updateSessionState = async (state: Partial<SessionState>) => {
  const sessionRef = doc(db, 'sessions', SESSION_DOC_ID);
  await setDoc(sessionRef, {
    ...state,
    updatedAt: serverTimestamp()
  }, { merge: true });
};

// 세션 상태 실시간 구독
export const subscribeToSession = (callback: (state: SessionState | null) => void) => {
  const sessionRef = doc(db, 'sessions', SESSION_DOC_ID);
  return onSnapshot(sessionRef, (snapshot) => {
    if (snapshot.exists()) {
      callback(snapshot.data() as SessionState);
    } else {
      callback(null);
    }
  });
};

// 결과 공개
export const revealResults = async () => {
  await updateSessionState({ isResultsRevealed: true });
};

// 세션 리셋
export const resetSession = async () => {
  // 세션 상태 리셋
  await updateSessionState({ isResultsRevealed: false });

  // 모든 팀 제출 삭제
  // (Firestore에서는 컬렉션 전체 삭제가 복잡하므로, 클라이언트에서 개별 처리)
};

// 팀 제출 저장
export const submitTeamResult = async (
  teamNumber: number,
  submission: Omit<TeamSubmission, 'timestamp'>
) => {
  const submissionRef = doc(db, 'submissions', `team_${teamNumber}`);
  await setDoc(submissionRef, {
    ...submission,
    timestamp: Date.now()
  });
};

// 팀 제출 현황 실시간 구독
export const subscribeToSubmissions = (
  callback: (submissions: Record<number, TeamSubmission>) => void
) => {
  const submissionsRef = collection(db, 'submissions');
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
export const clearAllSubmissions = async (maxTeams: number) => {
  for (let i = 1; i <= maxTeams; i++) {
    const submissionRef = doc(db, 'submissions', `team_${i}`);
    try {
      await deleteDoc(submissionRef);
    } catch (e) {
      // 문서가 없으면 무시
    }
  }
};

// 팀 노트 저장
export const saveTeamNotes = async (teamNumber: number, notes: string[]) => {
  const notesRef = doc(db, 'teamNotes', `team_${teamNumber}`);
  await setDoc(notesRef, {
    notes,
    updatedAt: serverTimestamp()
  });
};

// 팀 노트 실시간 구독
export const subscribeToTeamNotes = (
  teamNumber: number,
  callback: (notes: string[]) => void
) => {
  const notesRef = doc(db, 'teamNotes', `team_${teamNumber}`);
  return onSnapshot(notesRef, (snapshot) => {
    if (snapshot.exists()) {
      const data = snapshot.data() as TeamNotes;
      callback(data.notes);
    } else {
      callback(['']);
    }
  });
};
