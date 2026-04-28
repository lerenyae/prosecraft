'use client';


import { useState, useRef, useMemo } from 'react';
import { useRouter } from 'next/navigation';
import { useUser } from '@clerk/nextjs';
import Link from 'next/link';
import { useStore } from '@/lib/store';
import { Plus, Calendar, PenTool, Upload, Trash2, Sparkles } from 'lucide-react';


// Calculate word count for a specific project by reading chapters/scenes from localStorage
function getProjectWordCount(projectId: string): number {
  if (typeof window === 'undefined') return 0;
  try {
    const chapters = JSON.parse(localStorage.getItem('prosecraft-chapters') || '{}');
    const scenes = JSON.parse(localStorage.getItem('prosecraft-scenes') || '{}');


    const projectChapterIds = Object.values(chapters)
      .filter((c: any) => c.projectId === projectId)
      .map((c: any) => c.id);


    return Object.values(scenes)
      .filter((s: any) => projectChapterIds.includes(s.chapterId))
      .reduce((sum: number, s: any) => sum + (s.wordCount || 0), 0);
  } catch {
    return 0;
  }
}
import ThemeToggle from '@/components/ThemeToggle';
import OnboardingModal from '@/components/OnboardingModal';
import PlanBadge from '@/components/PlanBadge';
import { QuotaBadge } from '@/components/QuotaBadge';
import SettingsMenu from '@/components/SettingsMenu';


const GENRE_OPTIONS = [
  'Mystery/Thriller',
  'Romance',
  'Fantasy/Sci-Fi',
