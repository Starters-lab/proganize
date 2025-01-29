export interface Flashcard {
  id: string;
  question: string;
  answer: string;
  hints?: string[];
  category: string;
  subcategory?: string;
  user_id: string;
  is_public: boolean;
  created_at: string;
  updated_at: string;
  difficulty_level?: number;
  last_reviewed?: string;
  review_count?: number;
  success_rate?: number;
}

export type FlashcardMode = 'standard' | 'typing' | 'multipleChoice' | 'spaced';

export interface FlashcardSet {
  id: string;
  title: string;
  description?: string;
  category: string;
  user_id: string;
  is_public: boolean;
  created_at: string;
  updated_at: string;
  card_count: number;
}

export interface FlashcardProgress {
  user_id: string;
  flashcard_id: string;
  correct_count: number;
  incorrect_count: number;
  last_reviewed: string;
  next_review?: string;
  difficulty_rating?: number;
}

export interface FlashcardData {
  id: string;
  question: string;
  answer: string;
  category: string;
  lastReviewed?: Date;
  nextReview?: Date;
  difficulty?: number; // 1-5, where 1 is easiest
  consecutiveCorrect?: number;
}

export interface MultipleChoiceOption {
  text: string;
  isCorrect: boolean;
}

// Spaced repetition intervals in milliseconds
export const SPACED_INTERVALS = {
  EASY: 7 * 24 * 60 * 60 * 1000, // 7 days
  MEDIUM: 3 * 24 * 60 * 60 * 1000, // 3 days
  HARD: 24 * 60 * 60 * 1000, // 1 day
  AGAIN: 10 * 60 * 1000, // 10 minutes
};
