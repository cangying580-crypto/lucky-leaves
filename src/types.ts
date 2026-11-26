export interface Profile {
  id: string;
  nickname: string;
  birthYear: number;
}

export interface Session {
  userId: string;
  email: string;
  profile: Profile;
}

export interface Forest {
  id: string;
  userId: string;
  name: string;
  createdAt: string;
}

export type TreeCategory = 'growth' | 'study' | 'career' | 'health' | 'dream' | 'relation';

export interface Tree {
  id: string;
  forestId: string;
  userId: string;
  title: string;
  category: TreeCategory;
  x: number;
  y: number;
  scale: number;
  seed: string;
  plantedAt: string;
}

export interface GrowthEvent {
  id: string;
  treeId: string;
  userId: string;
  title: string;
  note: string;
  dueDate: string | null;
  completedAt: string | null;
  createdAt: string;
}

export const CATEGORIES: Record<TreeCategory, { label: string; color: string; dark: string }> = {
  growth: { label: '成长', color: '#f2b134', dark: '#c07f10' },
  study: { label: '学习', color: '#4aa3df', dark: '#2b6fa8' },
  career: { label: '事业', color: '#e8604c', dark: '#b23a2a' },
  health: { label: '健康', color: '#58b368', dark: '#33803f' },
  dream: { label: '梦想', color: '#a06cd5', dark: '#6f42a8' },
  relation: { label: '情感', color: '#ef7fae', dark: '#c2497c' },
};

export const CATEGORY_KEYS = Object.keys(CATEGORIES) as TreeCategory[];

export function ageOf(birthYear: number): number {
  return Math.max(0, new Date().getFullYear() - birthYear);
}

export type TreeStage = 0 | 1 | 2 | 3 | 4;

export function stageForAge(age: number): TreeStage {
  if (age < 12) return 0;
  if (age < 18) return 1;
  if (age < 30) return 2;
  if (age < 45) return 3;
  return 4;
}

export const STAGE_NAMES = ['幼苗', '小树', '成树', '大树', '古树'];