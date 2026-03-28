export interface Project {
  id: string;
  title: string;
  genre: string;
  description: string;
  wordCountGoal: number;
  createdAt: Date;
  updatedAt: Date;
}

export interface Chapter {
  id: string;
  projectId: string;
  title: string;
  sortOrder: number;
  createdAt: Date;
}

export interface Scene {
  id: string;
  chapterId: string;
  title: string;
  content: string; // HTML from TipTap
  wordCount: number;
  sortOrder: number;
  povCharacter?: string;
  location?: string;
  notes?: string;
  createdAt: Date;
  updatedAt: Date;
}

export interface Character {
  id: string;
  projectId: string;
  name: string;
  role: string;
  description?: string;
  personality?: string;
  backstory?: string;
  goals?: string;
  flaws?: string;
  arc?: string;
  speechPatterns?: string;
}
