export type StudyType = 'OPEN' | 'CLOSED' | 'HYBRID';
export type StudyStatus = 'DRAFT' | 'PUBLISHED' | 'CLOSED';

export interface Study {
  id: number;
  researcherId: number;
  title: string;
  description: string;
  type: StudyType;
  status: StudyStatus;
  maxParticipants: number | null;
  endsAt: string | null;
  allowUnsorted: boolean;
  instructions: string;
  shareToken: string;
  createdAt: string;
  updatedAt: string;
  cards?: Card[];
  researcherCategories?: Category[];
  _count?: { sessions: number; cards: number };
}

export interface Card {
  id: number;
  studyId: number;
  name: string;
  description: string;
  createdAt: string;
}

export interface Category {
  id: number;
  studyId: number;
  sessionId: number | null;
  label: string;
  createdAt: string;
}

export interface Session {
  id: number;
  studyId: number;
  participantRef: string;
  consentGiven: boolean;
  startedAt: string | null;
  completedAt: string | null;
  durationSecs: number | null;
  submitted: boolean;
  excluded: boolean;
  sortItems: SortItem[];
  categories: Category[];
}

export interface SortItem {
  id: number;
  sessionId: number;
  cardId: number;
  categoryId: number | null;
  card: Card;
  category: Category | null;
}

export interface SimilarityResult {
  cards: { id: number; name: string }[];
  matrix: number[][];
}

export interface DendrogramNode {
  id: string;
  name?: string;
  height: number;
  children?: DendrogramNode[];
}

export interface ClusteringResult {
  dendrogram: DendrogramNode;
  cards: { id: number; name: string }[];
  clusteredMatrix: number[][];
}

export interface Researcher {
  id: number;
  username: string;
}

// Participant-facing types
export interface ParticipantStudy {
  id: number;
  title: string;
  description: string;
  type: StudyType;
  allowUnsorted: boolean;
  instructions: string;
  cards: Card[];
  researcherCategories: Category[];
}
