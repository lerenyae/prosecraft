'use client';

import { useEffect, useState, useCallback, useMemo, use } from 'react';
import Link from 'next/link';
import { useStore } from '@/lib/store';
import {
  ArrowLeft,
  Plus,
  LayoutGrid,
  GripVertical,
  Link2,
  X,
  BookOpen,
  Sparkles,
  Check,
  Palette 
} from 'lucide-react';
import ThemeToggle from '@/components/ThemeToggle';
import {
  StoryboardCard,
  CardColor,
  BeatType,
  PlotBeat,
  BeatSheetTemplate,
  BEAT_SHEET_TEMPLATES,
  Scene,
  Chapter 
} from '@/types';

// ============================================================================
// Helpers
// ============================================================================

function safeGetItem(key: string): string | null {
  if (typeof window === 'undefined') return null;
  try { return localStorage.getItem(key); } catch { return null; }
}
function safeSetItem(key: string, value: string): void {
  if (typeof window === 'undefined') return;
  try { localStorage.setItem(key, value); } catch { /* noop */ }
}

function generateId() {
  return Math.random().toString(36).substring(2, 15) + Date.now().toString(36);
}

const CARD_COLORS: { value: CardColor; bg: string; border: string; text: string; label: string }[] = [
  { value: 'yellow', bg: 'bg-yellow-100 dark:bg-yellow-900/30', border: 'border-yellow-300 dark:border-yellow-700', text: 'text-yellow-900 dark:text-yellow-100', label: 'Yellow' },
  { value: 'blue', bg: 'bg-blue-100 dark:bg-blue-900/30', border: 'border-blue-300 dark:border-blue-700', text: 'text-blue-900 dark:text-blue-100', label: 'Blue' },
  { value: 'green', bg: 'bg-green-100 dark:bg-green-900/30', border: 'border-green-300 dark:border-green-700', text: 'text-green-900 dark:text-green-100', label: 'Green' },
  { value: 'pink', bg: 'bg-pink-100 dark:bg-pink-900/30', border: 'border-pink-300 dark:border-pink-700', text: 'text-pink-900 dark:text-pink-100', label: 'Pink' },
  { value: 'purple', bg: 'bg-purple-100 dark:bg-purple-900/30', border: 'border-purple-300 dark:border-purple-700', text: 'text-purple-900 dark:text-purple-100', label: 'Purple' },
  { value: 'orange', bg: 'bg-orange-100 dark:bg-orange-900/30', border: 'border-orange-300 dark:border-orange-700', text: 'text-orange-900 dark:text-orange-100', label: 'Orange' },
  { value: 'red', bg: 'bg-red-100 dark:bg-red-900/30', border: 'border-red-300 dark:border-red-700', text: 'text-red-900 dark:text-red-100', label: 'Red' },
  { value: 'white', bg: 'bg-white dark:bg-gray-800', border: 'border-gray-300 dark:border-gray-600', text: 'text-gray-900 dark:text-gray-100', label: 'White' },
];

const ACT_COLORS: Record<number, string> = {
  1: 'border-l-blue-500',
  2: 'border-l-amber-500',
  3: 'border-l-red-500' 
};

const ACT_LABELS: Record<number, string> = {
  1: 'Act I -- Setup',
  2: 'Act II -- Confrontation',
  3: 'Act III -- Resolution' 
};

// ============================================================================
// Card Component
// ============================================================================

function CorkboardCard({
  card,
  scenes,
  chapters,
  onUpdate,
  onDelete,
  onLinkScene 
}: {
  card: StoryboardCard;
  scenes: Scene[];
  chapters: Chapter[];
  onUpdate: (id: string, updates: Partial<StoryboardCard>) => void;
  onDelete: (id: string) => void;
  onLinkScene: (cardId: string, sceneId: string | undefined) => void;
}) {
    const [showColorPicker, setShowColorPicker] = useState(false);
  const [showScenePicker, setShowScenePicker] = useState(false);
  const colorConfig = CARD_COLORS.find(c => c.value === card.color) || CARD_COLORS[0];
  const linkedScene = card.sceneId ? scenes.find(s => s.id === card.sceneId) : null;
  const linkedChapter = linkedScene ? chapters.find(c => c.id === linkedScene.chapterId) : null;

  return (
    <div
      className={`relative rounded-lg border-2 ${colorConfig.bg} ${colorConfig.border} shadow-sm hover:shadow-md transition-shadow group`}
      style={{ minHeight: '160px' }}
    >
      {/* Top bar */}
      <div className="flex items-center gap-1 px-3 pt-2 pb-1">
        <GripVertical className="w-3.5 h-3.5 text-gray-400 opacity-0 group-hover:opacity-100 cursor-grab transition-opacity" />
        <div className="flex-1" />
        {/* Color picker */}
        <div className="relative">
          <button
            onClick={() => setShowColorPicker(!showColorPicker)}
            className="p-1 text-gray-400 hover:text-gray-600 dark:hover:text-gray-300 opacity-0 group-hover:opacity-100 transition-opacity"
            title="Change color"
          >
            <Palette className="w-3.5 h-3.5" />
          </button>
          {showColorPicker && (
            <div className="absolute right-0 top-full mt-1 p-1.5 bg-white dark:bg-gray-800 rounded-lg shadow-xl border border-gray-200 dark:border-gray-700 flex gap-1 z-20">
              {CARD_COLORS.map((c) => (
                <button
                  key={c.value}
                  onClick={() => { onUpdate(card.id, { color: c.value }); setShowColorPicker(false); }}
                  className={`w-5 h-5 rounded-full border ${c.bg} ${c.border} ${card.color === c.value ? 'ring-2 ring-blue-500' : ''}`}
                  title={c.label}
                />
              ))}
            </div>
          )}
        </div>
        {/* Link scene */}
        <div className="relative">
          <button
            onClick={() => setShowScenePicker(!showScenePicker)}
            className={`p-1 transition-opacity ${linkedScene ? 'text-blue-500' : 'text-gray-400 hover:text-gray-600 dark:hover:text-gray-300 opacity-0 group-hover:opacity-100'}`}
            title={linkedScene ? `Linked: ${linkedScene.title}` : 'Link to scene'}
          >
            <Link2 className="w-3.5 h-3.5" />
          </button>
          {showScenePicker && (
            <div className="absolute right-0 top-full mt-1 w-56 max-h-48 overflow-y-auto bg-white dark:bg-gray-800 rounded-lg shadow-xl border border-gray-200 dark:border-gray-700 z-20">
              <button
                onClick={() => { onLinkScene(card.id, undefined); setShowScenePicker(false); }}
                className="w-full text-left px-3 py-2 text-xs text-gray-400 hover:bg-gray-100 dark:hover:bg-gray-700"
              >
                No link
              </button>
              {chapters.map(ch => {
                const chScenes = scenes.filter(s => s.chapterId === ch.id);
                if (chScenes.length === 0) return null;
                return (
                  <div key={ch.id}>
                    <div className="px-3 py-1 text-[10px] font-semibold text-gray-400 uppercase tracking-wider bg-gray-50 dark:bg-gray-800/50">{ch.title}</div>
                    {chScenes.map(s => (
                      <button
                        key={s.id}
                        onClick={() => { onLinkScene(card.id, s.id); setShowScenePicker(false); }}
                        className={`w-full text-left px-3 py-1.5 text-xs hover:bg-gray-100 dark:hover:bg-gray-700 ${card.sceneId === s.id ? 'text-blue-600 font-medium' : 'text-gray-700 dark:text-gray-300'}`}
                      >
                        {s.title || 'Untitled scene'}
                      </button>
                    ))}
                  </div>
                );
              })}
            </div>
          )}
        </div>
        {/* Delete */}
        <button
          onClick={() => onDelete(card.id)}
          className="p-1 text-gray-400 hover:text-red-500 opacity-0 group-hover:opacity-100 transition-opacity"
          title="Delete card"
        >
          <X className="w-3.5 h-3.5" />
        </button>
      </div>

      {/* Title */}
      <div className="px-3">
        <input
          type="text"
          value={card.title}
          onChange={(e) => onUpdate(card.id, { title: e.target.value })}
          placeholder="Card title"
          className={`w-full text-sm font-semibold bg-transparent border-none focus:ring-0 p-0 ${colorConfig.text} placeholder:opacity-40`}
        />
      </div>

      {/* Content */}
      <div className="px-3 pb-2 mt-1">
        <textarea
          value={card.content}
          onChange={(e) => onUpdate(card.id, { content: e.target.value })}
          placeholder="Notes..."
          rows={3}
          className={`w-full text-xs bg-transparent border-none focus:ring-0 p-0 resize-none ${colorConfig.text} placeholder:opacity-40`}
        />
      </div>

      {/* Linked scene badge */}
      {linkedScene && (
        <div className="px-3 pb-2">
          <span className="inline-flex items-center gap-1 text-[10px] font-medium px-2 py-0.5 rounded-full bg-blue-100 dark:bg-blue-900/40 text-blue-700 dark:text-blue-300">
            <Link2 className="w-2.5 h-2.5" />
            {linkedChapter?.title} &rsaquo; {linkedScene.title || 'Untitled'}
          </span>
        </div>
      )}
    </div>
  );
}

// ============================================================================
// Beat Sheet View
// ============================================================================

function BeatSheetView({
  template,
  beats,
  scenes,
  chapters,
  onUpdateBeat,
  onLinkBeatScene 
}: {
  template: BeatSheetTemplate;
  beats: PlotBeat[];
  scenes: Scene[];
  chapters: Chapter[];
  onUpdateBeat: (id: string, updates: Partial<PlotBeat>) => void;
  onLinkBeatScene: (beatId: string, sceneId: string | undefined) => void;
}) {
  let currentAct = 0;

  return (
    <div className="space-y-2">
      {template.beats.map((templateBeat, idx) => {
        const beat = beats.find(b => b.beatType === templateBeat.beatType) || {
          id: `beat-${templateBeat.beatType}`,
          projectId: '',
          beatType: templateBeat.beatType,
          title: '',
          description: '',
          sortOrder: idx,
          completed: false 
        };
        const linkedScene = beat.sceneId ? scenes.find(s => s.id === beat.sceneId) : null;
        const linkedChapter = linkedScene ? chapters.find(c => c.id === linkedScene.chapterId) : null;

        const showActHeader = templateBeat.act !== currentAct;
        if (showActHeader) currentAct = templateBeat.act;

        return (
          <div key={templateBeat.beatType}>
            {showActHeader && (
              <div className="flex items-center gap-3 pt-6 pb-2 first:pt-0">
                <span className={`text-xs font-bold uppercase tracking-wider ${templateBeat.act === 1 ? 'text-blue-500' : templateBeat.act === 2 ? 'text-amber-500' : 'text-red-500'}`}>
                  {ACT_LABELS[templateBeat.act]}
                </span>
                <div className="flex-1 h-px bg-gray-200 dark:bg-gray-700" />
              </div>
            )}
            <div className={`flex gap-4 p-4 rounded-lg border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-900 border-l-4 ${ACT_COLORS[templateBeat.act]}`}>
              {/* Completion toggle */}
              <button
                onClick={() => onUpdateBeat(beat.id, { completed: !beat.completed, beatType: templateBeat.beatType })}
                className={`mt-0.5 flex-shrink-0 w-5 h-5 rounded-full border-2 flex items-center justify-center transition-colors ${
                  beat.completed
                    ? 'bg-green-500 border-green-500 text-white'
                    : 'border-gray-300 dark:border-gray-600 hover:border-green-400'
                }`}
              >
                {beat.completed && <Check className="w-3 h-3" />}
              </button>

              <div className="flex-1 min-w-0">
                {/* Beat label */}
                <div className="flex items-center gap-2 mb-1">
                  <span className="text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wider">
                    {templateBeat.label}
                  </span>
                  {templateBeat.percentOfStory !== undefined && (
                    <span className="text-[10px] text-gray-400 dark:text-gray-600">~{templateBeat.percentOfStory}%</span>
                  )}
                </div>

                {/* Template description */}
                <p className="text-xs text-gray-400 dark:text-gray-500 mb-2 italic">{templateBeat.description}</p>

                {/* User's notes for this beat */}
                <textarea
                  value={beat.description}
                  onChange={(e) => onUpdateBeat(beat.id, { description: e.target.value, beatType: templateBeat.beatType })}
                  placeholder="How does this beat play out in your story?"
                  rows={2}
                  className="w-full text-sm bg-gray-50 dark:bg-gray-800/50 rounded-md border border-gray-200 dark:border-gray-700 px-3 py-2 resize-none focus:ring-2 focus:ring-blue-500 focus:border-transparent placeholder:text-gray-400 dark:placeholder:text-gray-600"
                />

                {/* Scene link */}
                <div className="mt-2 flex items-center gap-2">
                  <Link2 className="w-3.5 h-3.5 text-gray-400" />
                  <select
                    value={beat.sceneId || ''}
                    onChange={(e) => onLinkBeatScene(beat.id, e.target.value || undefined)}
                    className="text-xs bg-transparent border border-gray-200 dark:border-gray-700 rounded-md px-2 py-1 text-gray-600 dark:text-gray-400 focus:ring-2 focus:ring-blue-500"
                  >
                    <option value="">Link to scene...</option>
                    {chapters.map(ch => {
                      const chScenes = scenes.filter(s => s.chapterId === ch.id);
                      return chScenes.map(s => (
                        <option key={s.id} value={s.id}>
                          {ch.title} &rsaquo; {s.title || 'Untitled'}
                        </option>
                      ));
                    })}
                  </select>
                  {linkedScene && (
                    <span className="text-[10px] text-blue-500">
                      {linkedChapter?.title} &rsaquo; {linkedScene.title}
                    </span>
                  )}
                </div>
              </div>
            </div>
          </div>
        );
      })}
    </div>
  );
}

// ============================================================================
// Main Page
// ============================================================================

interface StoryboardPageProps {
  params: Promise<{ id: string }>;
}

export default function StoryboardPage({ params }: StoryboardPageProps) {
  const { id: projectId } = use(params);
  const store = useStore();
  const project = store.projects.find((p) => p.id === projectId);

  // --- State ---
  const [cards, setCards] = useState<StoryboardCard[]>([]);
  const [beats, setBeats] = useState<PlotBeat[]>([]);
  const [viewMode, setViewMode] = useState<'corkboard' | 'beats'>('corkboard');
  const [selectedTemplate, setSelectedTemplate] = useState<string>('three-act');
  const [scenes, setScenes] = useState<Scene[]>([]);
  const [chapters, setChapters] = useState<Chapter[]>([]);

  // --- Persistence keys ---
  const cardsKey = `prosecraft-storyboard-v2-${projectId}`;
  const beatsKey = `prosecraft-beats-${projectId}`;
  const templateKey = `prosecraft-beat-template-${projectId}`;

  // --- Load data ---
  useEffect(() => {
    // Load storyboard cards (migrate from old format)
    const saved = safeGetItem(cardsKey);
    const oldSaved = safeGetItem(`prosecraft-storyboard-${projectId}`);
    if (saved) {
      try { setCards(JSON.parse(saved)); } catch { /* noop */ }
    } else if (oldSaved) {
      try {
        const old = JSON.parse(oldSaved);
        const migrated = old.map((c: any, i: number) => ({
          ...c,
          sortOrder: c.sortOrder ?? i,
          createdAt: c.createdAt || new Date(),
          updatedAt: c.updatedAt || new Date() 
        }));
        setCards(migrated);
        safeSetItem(cardsKey, JSON.stringify(migrated));
      } catch { /* noop */ }
    }
    // Load beats
    const savedBeats = safeGetItem(beatsKey);
    if (savedBeats) {
      try { setBeats(JSON.parse(savedBeats)); } catch { /* noop */ }
    }
    // Load template preference
    const savedTemplate = safeGetItem(templateKey);
    if (savedTemplate) setSelectedTemplate(savedTemplate);
  }, [projectId, cardsKey, beatsKey, templateKey]);

  // Load scenes and chapters from store
  useEffect(() => {
    const chaptersRaw = safeGetItem('prosecraft-chapters');
    const scenesRaw = safeGetItem('prosecraft-scenes');
    if (chaptersRaw) {
      try {
        const allChapters: Record<string, Chapter> = JSON.parse(chaptersRaw);
        setChapters(
          Object.values(allChapters)
            .filter(c => c.projectId === projectId)
            .sort((a, b) => a.sortOrder - b.sortOrder)
        );
      } catch { /* noop */ }
    }
    if (scenesRaw) {
      try {
        const allScenes: Record<string, Scene> = JSON.parse(scenesRaw);
        setScenes(Object.values(allScenes));
      } catch { /* noop */ }
    }
  }, [projectId]);

  // --- Save helpers ---
  const saveCards = useCallback((c: StoryboardCard[]) => {
    setCards(c);
    safeSetItem(cardsKey, JSON.stringify(c));
  }, [cardsKey]);

  const saveBeats = useCallback((b: PlotBeat[]) => {
    setBeats(b);
    safeSetItem(beatsKey, JSON.stringify(b));
  }, [beatsKey]);

  // --- Card CRUD ---
  const addCard = useCallback(() => {
    const newCard: StoryboardCard = {
      id: generateId(),
      projectId,
      title: '',
      content: '',
      color: 'yellow',
      sortOrder: cards.length,
      createdAt: new Date(),
      updatedAt: new Date() 
    };
    saveCards([...cards, newCard]);
  }, [cards, projectId, saveCards]);

  const updateCard = useCallback((id: string, updates: Partial<StoryboardCard>) => {
    saveCards(cards.map(c => c.id === id ? { ...c, ...updates, updatedAt: new Date() } : c));
  }, [cards, saveCards]);

  const deleteCard = useCallback((id: string) => {
    saveCards(cards.filter(c => c.id !== id));
  }, [cards, saveCards]);

  const linkCardScene = useCallback((cardId: string, sceneId: string | undefined) => {
    updateCard(cardId, { sceneId });
  }, [updateCard]);

  // --- Beat CRUD ---
  const updateBeat = useCallback((id: string, updates: Partial<PlotBeat>) => {
    const existing = beats.find(b => b.id === id);
    if (existing) {
      saveBeats(beats.map(b => b.id === id ? { ...b, ...updates } : b));
    } else {
      // Create new beat
      saveBeats([...beats, { id, projectId, beatType: '' as BeatType, title: '', description: '', sortOrder: beats.length, completed: false, ...updates }]);
    }
  }, [beats, projectId, saveBeats]);

  const linkBeatScene = useCallback((beatId: string, sceneId: string | undefined) => {
    updateBeat(beatId, { sceneId });
  }, [updateBeat]);

  // --- Template ---
  const currentTemplate = useMemo(() =>
    BEAT_SHEET_TEMPLATES.find(t => t.id === selectedTemplate) || BEAT_SHEET_TEMPLATES[0],
    [selectedTemplate]
  );

  // --- Render ---
  if (!project) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50 dark:bg-gray-950">
        <p className="text-gray-500">Project not found.</p>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-gray-950 text-gray-900 dark:text-gray-100">
      {/* Header */}
      <header className="h-14 border-b border-gray-200 dark:border-gray-800 bg-white dark:bg-gray-900 flex items-center px-4 gap-4">
        <Link
          href={`/project/${projectId}`}
          className="flex items-center gap-2 text-sm text-gray-600 dark:text-gray-400 hover:text-gray-900 dark:hover:text-gray-100 transition-colors"
        >
          <ArrowLeft className="w-4 h-4" />
          Back to Editor
        </Link>
        <div className="h-5 w-px bg-gray-200 dark:bg-gray-700" />
        <h1 className="text-sm font-semibold flex items-center gap-2">
          <LayoutGrid className="w-4 h-4 text-purple-500" />
          Storyboard -- {project.title}
        </h1>
        <div className="flex-1" />

        {/* View mode toggle */}
        <div className="flex items-center gap-1 bg-gray-100 dark:bg-gray-800 rounded-lg p-0.5">
          <button
            onClick={() => setViewMode('corkboard')}
            className={`flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium rounded-md transition-colors ${
              viewMode === 'corkboard'
                ? 'bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100 shadow-sm'
                : 'text-gray-500 dark:text-gray-400 hover:text-gray-700 dark:hover:text-gray-300'
            }`}
          >
            <LayoutGrid className="w-3.5 h-3.5" /> Corkboard
          </button>
          <button
            onClick={() => setViewMode('beats')}
            className={`flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium rounded-md transition-colors ${
              viewMode === 'beats'
                ? 'bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100 shadow-sm'
                : 'text-gray-500 dark:text-gray-400 hover:text-gray-700 dark:hover:text-gray-300'
            }`}
          >
            <BookOpen className="w-3.5 h-3.5" /> Beat Sheet
          </button>
        </div>

        <ThemeToggle />
      </header>

      {/* Content */}
      <div className="h-[calc(100vh-3.5rem)] overflow-y-auto">
        {viewMode === 'corkboard' ? (
          /* ===================== CORKBOARD VIEW ===================== */
          <div className="p-6">
            {/* Toolbar */}
            <div className="flex items-center gap-3 mb-6">
              <button
                onClick={addCard}
                className="flex items-center gap-2 px-4 py-2 text-sm font-medium rounded-lg bg-purple-600 text-white hover:bg-purple-700 transition-colors"
              >
                <Plus className="w-4 h-4" /> Add Card
              </button>
              <span className="text-sm text-gray-500 dark:text-gray-400">
                {cards.length} card{cards.length !== 1 ? 's' : ''}
              </span>
            </div>

            {/* Cards grid */}
            {cards.length === 0 ? (
              <div className="text-center py-24 text-gray-400 dark:text-gray-600">
                <LayoutGrid className="w-16 h-16 mx-auto mb-4 opacity-30" />
                <p className="text-lg font-medium">Your corkboard is empty</p>
                <p className="text-sm mt-1">Add cards to plan scenes, plot points, and ideas</p>
                <button
                  onClick={addCard}
                  className="mt-4 inline-flex items-center gap-2 px-4 py-2 text-sm font-medium rounded-lg bg-purple-600 text-white hover:bg-purple-700 transition-colors"
                >
                  <Plus className="w-4 h-4" /> Add Your First Card
                </button>
              </div>
            ) : (
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 2xl:grid-cols-5 gap-4">
                {cards.sort((a, b) => a.sortOrder - b.sortOrder).map((card) => (
                  <CorkboardCard
                    key={card.id}
                    card={card}
                    scenes={scenes}
                    chapters={chapters}
                    onUpdate={updateCard}
                    onDelete={deleteCard}
                    onLinkScene={linkCardScene}
                  />
                ))}
              </div>
            )}
          </div>
        ) : (
          /* ===================== BEAT SHEET VIEW ===================== */
          <div className="p-6 max-w-3xl mx-auto">
            {/* Template selector */}
            <div className="flex items-center gap-3 mb-6">
              <Sparkles className="w-4 h-4 text-purple-500" />
              <select
                value={selectedTemplate}
                onChange={(e) => {
                  setSelectedTemplate(e.target.value);
                  safeSetItem(templateKey, e.target.value);
                }}
                className="text-sm px-3 py-2 rounded-lg border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800 text-gray-900 dark:text-gray-100 focus:ring-2 focus:ring-purple-500"
              >
                {BEAT_SHEET_TEMPLATES.map(t => (
                  <option key={t.id} value={t.id}>{t.name}</option>
                ))}
              </select>
              <span className="text-xs text-gray-400 dark:text-gray-500">{currentTemplate.description}</span>
            </div>

            <BeatSheetView
              template={currentTemplate}
              beats={beats}
              scenes={scenes}
              chapters={chapters}
              onUpdateBeat={updateBeat}
              onLinkBeatScene={linkBeatScene}
            />
          </div>
        )}
      </div>
    </div>
  );
}
