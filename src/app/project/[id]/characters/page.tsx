'use client';

import { useEffect, useState, useCallback, useMemo, use } from 'react';
import Link from 'next/link';
import { useStore } from '@/lib/store';
import {
  ArrowLeft,
  Plus,
  Trash2,
  Users,
  User,
  ChevronRight,
  Search,
  X,
  Sparkles
} from 'lucide-react';
import ThemeToggle from '@/components/ThemeToggle';
import {
  Character,
  CharacterRole,
  CharacterRelationship,
  RelationshipType,
  CHARACTER_ROLE_OPTIONS,
  GENRE_SPECIFIC_FIELDS
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

const AVATAR_EMOJIS: string[] = [];

const ROLE_COLORS: Record<string, string> = {
  protagonist: 'bg-blue-500',
  antagonist: 'bg-red-500',
  deuteragonist: 'bg-purple-500',
  mentor: 'bg-amber-500',
  'love-interest': 'bg-pink-500',
  sidekick: 'bg-green-500',
  supporting: 'bg-slate-500',
  minor: 'bg-gray-400'
};

const RELATIONSHIP_TYPES: { value: RelationshipType; label: string; color: string }[] = [
  { value: 'ally', label: 'Ally', color: 'bg-green-500' },
  { value: 'enemy', label: 'Enemy', color: 'bg-red-500' },
  { value: 'family', label: 'Family', color: 'bg-amber-500' },
  { value: 'romantic', label: 'Romantic', color: 'bg-pink-500' },
  { value: 'mentor-mentee', label: 'Mentor / Mentee', color: 'bg-purple-500' },
  { value: 'rival', label: 'Rival', color: 'bg-orange-500' },
  { value: 'friend', label: 'Friend', color: 'bg-blue-500' },
  { value: 'colleague', label: 'Colleague', color: 'bg-slate-500' },
];

// ============================================================================
// Tab Definitions
// ============================================================================

type ProfileTab = 'bio' | 'personality' | 'background' | 'arc' | 'voice' | 'genre' | 'relationships' | 'notes';

const PROFILE_TABS: { id: ProfileTab; label: string }[] = [
  { id: 'bio', label: 'Bio' },
  { id: 'personality', label: 'Personality' },
  { id: 'background', label: 'Background' },
  { id: 'arc', label: 'Arc' },
  { id: 'voice', label: 'Voice' },
  { id: 'genre', label: 'Genre' },
  { id: 'relationships', label: 'Relationships' },
  { id: 'notes', label: 'Notes' },
];

// ============================================================================
// Field Component
// ============================================================================

function ProfileField({
  label,
  value,
  onChange,
  placeholder,
  multiline = false
}: {
  label: string;
  value: string;
  onChange: (val: string) => void;
  placeholder?: string;
  multiline?: boolean;
}) {
  return (
    <div className="space-y-1.5">
      <label className="block text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wide">
        {label}
      </label>
      {multiline ? (
        <textarea
          value={value}
          onChange={(e) => onChange(e.target.value)}
          placeholder={placeholder}
          rows={4}
          className="w-full px-3 py-2 rounded-lg border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800 text-gray-900 dark:text-gray-100 text-sm resize-y focus:ring-2 focus:ring-blue-500 focus:border-transparent placeholder:text-gray-400 dark:placeholder:text-gray-600"
        />
      ) : (
        <input
          type="text"
          value={value}
          onChange={(e) => onChange(e.target.value)}
          placeholder={placeholder}
          className="w-full px-3 py-2 rounded-lg border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800 text-gray-900 dark:text-gray-100 text-sm focus:ring-2 focus:ring-blue-500 focus:border-transparent placeholder:text-gray-400 dark:placeholder:text-gray-600"
        />
      )}
    </div>
  );
}

// ============================================================================
// Character Card (sidebar list item)
// ============================================================================

function CharacterCard({
  character,
  isSelected,
  onClick
}: {
  character: Character;
  isSelected: boolean;
  onClick: () => void;
}) {
  const roleColor = ROLE_COLORS[character.role] || 'bg-gray-400';
  const roleLabel = CHARACTER_ROLE_OPTIONS.find(r => r.value === character.role)?.label || character.role;
  return (
    <button
      onClick={onClick}
      className={`w-full text-left p-3 rounded-lg border transition-all ${
        isSelected
          ? 'border-blue-500 bg-blue-50 dark:bg-blue-900/20 shadow-sm'
          : 'border-gray-200 dark:border-gray-700 hover:border-gray-300 dark:hover:border-gray-600 hover:bg-gray-50 dark:hover:bg-gray-800/50'
      }`}
    >
      <div className="flex items-center gap-3">
        <div className="text-2xl">{(character.name || 'U')[0].toUpperCase()}</div>
        <div className="flex-1 min-w-0">
          <div className="font-medium text-gray-900 dark:text-gray-100 truncate">{character.name || 'Unnamed'}</div>
          <div className="flex items-center gap-1.5 mt-0.5">
            <span className={`inline-block w-2 h-2 rounded-full ${roleColor}`}></span>
            <span className="text-xs text-gray-500 dark:text-gray-400">{roleLabel}</span>
          </div>
        </div>
        <ChevronRight className={`w-4 h-4 text-gray-400 transition-transform ${isSelected ? 'rotate-90' : ''}`} />
      </div>
    </button>
  );
}

// ============================================================================
// Relationship Editor
// ============================================================================

function RelationshipEditor({
  relationships,
  characters,
  currentCharacterId,
  onAdd,
  onRemove,
  onUpdate
}: {
  relationships: CharacterRelationship[];
  characters: Character[];
  currentCharacterId: string;
  onAdd: (rel: CharacterRelationship) => void;
  onRemove: (id: string) => void;
  onUpdate: (id: string, updates: Partial<CharacterRelationship>) => void;
}) {
  const [showAdd, setShowAdd] = useState(false);
  const [newTargetId, setNewTargetId] = useState('');
  const [newType, setNewType] = useState<RelationshipType>('ally');

  const myRelationships = relationships.filter(
    r => r.characterA === currentCharacterId || r.characterB === currentCharacterId
  );

  const otherCharacters = characters.filter(c => c.id !== currentCharacterId);
  const availableTargets = otherCharacters.filter(
    c => !myRelationships.some(
      r => (r.characterA === c.id || r.characterB === c.id)
    )
  );

  const handleAdd = () => {
    if (!newTargetId) return;
    onAdd({
      id: generateId(),
      projectId: characters[0]?.projectId || '',
      characterA: currentCharacterId,
      characterB: newTargetId,
      type: newType
    });
    setNewTargetId('');
    setNewType('ally');
    setShowAdd(false);
  };

  return (
    <div className="space-y-4">
      {myRelationships.length === 0 && !showAdd && (
        <p className="text-sm text-gray-500 dark:text-gray-400 italic">No relationships defined yet.</p>
      )}
      {myRelationships.map((rel) => {
        const otherId = rel.characterA === currentCharacterId ? rel.characterB : rel.characterA;
        const other = characters.find(c => c.id === otherId);
        const relType = RELATIONSHIP_TYPES.find(t => t.value === rel.type);
        return (
          <div key={rel.id} className="flex items-start gap-3 p-3 rounded-lg border border-gray-200 dark:border-gray-700 bg-gray-50 dark:bg-gray-800/50">
            <div className="text-xl">{(other?.name || 'U')[0].toUpperCase()}</div>
            <div className="flex-1 min-w-0">
              <div className="font-medium text-sm text-gray-900 dark:text-gray-100">{other?.name || 'Unknown'}</div>
              <div className="flex items-center gap-1.5 mt-1">
                <span className={`inline-block w-2 h-2 rounded-full ${relType?.color || 'bg-gray-400'}`}></span>
                <select
                  value={rel.type}
                  onChange={(e) => onUpdate(rel.id, { type: e.target.value as RelationshipType })}
                  className="text-xs bg-transparent border-none text-gray-600 dark:text-gray-400 focus:ring-0 p-0 cursor-pointer"
                >
                  {RELATIONSHIP_TYPES.map(t => (
                    <option key={t.value} value={t.value}>{t.label}</option>
                  ))}
                </select>
              </div>
              <input
                type="text"
                value={rel.description || ''}
                onChange={(e) => onUpdate(rel.id, { description: e.target.value })}
                placeholder="Describe the dynamic..."
                className="mt-2 w-full text-xs px-2 py-1 rounded border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800 text-gray-700 dark:text-gray-300 placeholder:text-gray-400 dark:placeholder:text-gray-600"
              />
            </div>
            <button onClick={() => onRemove(rel.id)} className="text-gray-400 hover:text-red-500 transition-colors">
              <X className="w-4 h-4" />
            </button>
          </div>
        );
      })}
      {showAdd ? (
        <div className="p-3 rounded-lg border border-blue-200 dark:border-blue-800 bg-blue-50 dark:bg-blue-900/20 space-y-3">
          <select
            value={newTargetId}
            onChange={(e) => setNewTargetId(e.target.value)}
            className="w-full text-sm px-3 py-2 rounded-lg border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800 text-gray-900 dark:text-gray-100"
          >
            <option value="">Select a character...</option>
            {availableTargets.map(c => (
              <option key={c.id} value={c.id}>{c.avatar || ''} {c.name}</option>
            ))}
          </select>
          <select
            value={newType}
            onChange={(e) => setNewType(e.target.value as RelationshipType)}
            className="w-full text-sm px-3 py-2 rounded-lg border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800 text-gray-900 dark:text-gray-100"
          >
            {RELATIONSHIP_TYPES.map(t => (
              <option key={t.value} value={t.value}>{t.label}</option>
            ))}
          </select>
          <div className="flex gap-2">
            <button onClick={handleAdd} disabled={!newTargetId} className="px-3 py-1.5 text-xs font-medium rounded-lg bg-blue-600 text-white hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed">Add</button>
            <button onClick={() => setShowAdd(false)} className="px-3 py-1.5 text-xs font-medium rounded-lg border border-gray-200 dark:border-gray-700 text-gray-600 dark:text-gray-400 hover:bg-gray-100 dark:hover:bg-gray-800">Cancel</button>
          </div>
        </div>
      ) : (
        availableTargets.length > 0 && (
          <button onClick={() => setShowAdd(true)} className="flex items-center gap-2 text-sm text-blue-600 dark:text-blue-400 hover:text-blue-700 dark:hover:text-blue-300">
            <Plus className="w-4 h-4" /> Add relationship
          </button>
        )
      )}
    </div>
  );
}

// ============================================================================
// Main Page
// ============================================================================

interface CharacterPageProps {
  params: Promise<{ id: string }>;
}

export default function CharactersPage({ params }: CharacterPageProps) {
  const { id: projectId } = use(params);
  const store = useStore();
  const project = store.projects.find((p) => p.id === projectId);

  // --- State ---
  const [characters, setCharacters] = useState<Character[]>([]);
  const [relationships, setRelationships] = useState<CharacterRelationship[]>([]);
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [activeTab, setActiveTab] = useState<ProfileTab>('bio');
  const [searchQuery, setSearchQuery] = useState('');
  const [showAvatarPicker, setShowAvatarPicker] = useState(false);

  // --- Persistence ---
  const charKey = `prosecraft-characters-v2-${projectId}`;
  const relKey = `prosecraft-relationships-${projectId}`;

  useEffect(() => {
    // Load characters (migrate from old format if needed)
    const saved = safeGetItem(charKey);
    const oldSaved = safeGetItem(`prosecraft-characters-${projectId}`);
    if (saved) {
      try { setCharacters(JSON.parse(saved)); } catch { /* noop */ }
    } else if (oldSaved) {
      try {
        const old: Character[] = JSON.parse(oldSaved);
        // Migrate: ensure all new fields exist
        const migrated = old.map(c => ({
          ...c,
          avatar: c.avatar || '',
          role: c.role || 'supporting',
          genreFields: c.genreFields || {}
        }));
        setCharacters(migrated);
        safeSetItem(charKey, JSON.stringify(migrated));
      } catch { /* noop */ }
    }
    // Load relationships
    const savedRel = safeGetItem(relKey);
    if (savedRel) {
      try { setRelationships(JSON.parse(savedRel)); } catch { /* noop */ }
    }
  }, [projectId, charKey, relKey]);

  const saveCharacters = useCallback((chars: Character[]) => {
    setCharacters(chars);
    safeSetItem(charKey, JSON.stringify(chars));
  }, [charKey]);

  const saveRelationships = useCallback((rels: CharacterRelationship[]) => {
    setRelationships(rels);
    safeSetItem(relKey, JSON.stringify(rels));
  }, [relKey]);

  // --- Character CRUD ---
  const addCharacter = useCallback(() => {
    const newChar: Character = {
      id: generateId(),
      projectId,
      name: '',
      role: 'supporting',
      avatar: '',
      genreFields: {}
    };
    const updated = [...characters, newChar];
    saveCharacters(updated);
    setSelectedId(newChar.id);
    setActiveTab('bio');
  }, [characters, projectId, saveCharacters]);

  const updateCharacter = useCallback((id: string, updates: Partial<Character>) => {
    const updated = characters.map(c => c.id === id ? { ...c, ...updates, updatedAt: new Date() } : c);
    saveCharacters(updated);
  }, [characters, saveCharacters]);

  const deleteCharacter = useCallback((id: string) => {
    const updated = characters.filter(c => c.id !== id);
    saveCharacters(updated);
    // Remove relationships involving this character
    const updatedRels = relationships.filter(r => r.characterA !== id && r.characterB !== id);
    saveRelationships(updatedRels);
    if (selectedId === id) setSelectedId(updated[0]?.id || null);
  }, [characters, relationships, selectedId, saveCharacters, saveRelationships]);

  // --- Selected character ---
  const selected = useMemo(() => characters.find(c => c.id === selectedId), [characters, selectedId]);

  // --- Genre fields ---
  const genreFields = useMemo(() => {
    const genre = project?.genre || 'general';
    return GENRE_SPECIFIC_FIELDS[genre] || [];
  }, [project?.genre]);

  // --- Search filter ---
  const filteredCharacters = useMemo(() => {
    if (!searchQuery.trim()) return characters;
    const q = searchQuery.toLowerCase();
    return characters.filter(c =>
      c.name.toLowerCase().includes(q) ||
      c.role.toLowerCase().includes(q) ||
      (c.description || '').toLowerCase().includes(q)
    );
  }, [characters, searchQuery]);

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
          <Users className="w-4 h-4 text-blue-500" />
          Characters - {project.title}
        </h1>
        <div className="flex-1" />
        <ThemeToggle />
      </header>

      <div className="flex h-[calc(100vh-3.5rem)]">
        {/* Left: Character List */}
        <div className="w-72 border-r border-gray-200 dark:border-gray-800 bg-white dark:bg-gray-900 flex flex-col">
          {/* Search */}
          <div className="p-3 border-b border-gray-200 dark:border-gray-800">
            <div className="relative">
              <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
              <input
                type="text"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder="Search characters..."
                className="w-full pl-8 pr-3 py-2 text-sm rounded-lg border border-gray-200 dark:border-gray-700 bg-gray-50 dark:bg-gray-800 focus:ring-2 focus:ring-blue-500 focus:border-transparent placeholder:text-gray-400 dark:placeholder:text-gray-600"
              />
            </div>
          </div>
          {/* List */}
          <div className="flex-1 overflow-y-auto p-3 space-y-2">
            {filteredCharacters.map((char) => (
              <CharacterCard
                key={char.id}
                character={char}
                isSelected={char.id === selectedId}
                onClick={() => { setSelectedId(char.id); setActiveTab('bio'); }}
              />
            ))}
            {characters.length === 0 && (
              <div className="text-center py-12 text-gray-400 dark:text-gray-600">
                <User className="w-10 h-10 mx-auto mb-3 opacity-50" />
                <p className="text-sm">No characters yet</p>
                <p className="text-xs mt-1">Create your first character to get started</p>
              </div>
            )}
          </div>
          {/* Add button */}
          <div className="p-3 border-t border-gray-200 dark:border-gray-800">
            <button
              onClick={addCharacter}
              className="w-full flex items-center justify-center gap-2 px-3 py-2 text-sm font-medium rounded-lg bg-blue-600 text-white hover:bg-blue-700 transition-colors"
            >
              <Plus className="w-4 h-4" /> New Character
            </button>
          </div>
        </div>

        {/* Right: Profile Editor */}
        <div className="flex-1 flex flex-col min-w-0">
          {selected ? (
            <>
              {/* Character header */}
              <div className="p-6 border-b border-gray-200 dark:border-gray-800 bg-white dark:bg-gray-900">
                <div className="flex items-start gap-4">
                  {/* Avatar picker */}
                  <div className="relative">
                    <button
                      onClick={() => setShowAvatarPicker(!showAvatarPicker)}
                      className="text-4xl hover:opacity-80 transition-opacity"
                      title="Change avatar"
                    >
                      {(selected.name || 'U')[0].toUpperCase()}
                    </button>
                    {showAvatarPicker && (
                      <div className="absolute top-full left-0 mt-2 p-2 bg-white dark:bg-gray-800 rounded-lg shadow-xl border border-gray-200 dark:border-gray-700 grid grid-cols-4 gap-1 z-10">
                        {AVATAR_EMOJIS.map((emoji) => (
                          <button
                            key={emoji}
                            onClick={() => { updateCharacter(selected.id, { avatar: emoji }); setShowAvatarPicker(false); }}
                            className="text-2xl p-1 hover:bg-gray-100 dark:hover:bg-gray-700 rounded"
                          >
                            {emoji}
                          </button>
                        ))}
                      </div>
                    )}
                  </div>
                  <div className="flex-1 min-w-0">
                    <input
                      type="text"
                      value={selected.name}
                      onChange={(e) => updateCharacter(selected.id, { name: e.target.value })}
                      placeholder="Character name"
                      className="text-2xl font-bold bg-transparent border-none focus:ring-0 p-0 w-full text-gray-900 dark:text-gray-100 placeholder:text-gray-300 dark:placeholder:text-gray-700"
                    />
                    <div className="flex items-center gap-3 mt-2">
                      <select
                        value={selected.role}
                        onChange={(e) => updateCharacter(selected.id, { role: e.target.value as CharacterRole })}
                        className="text-sm px-2 py-1 rounded-md border border-gray-200 dark:border-gray-700 bg-gray-50 dark:bg-gray-800 text-gray-700 dark:text-gray-300"
                      >
                        {CHARACTER_ROLE_OPTIONS.map(r => (
                          <option key={r.value} value={r.value}>{r.label}</option>
                        ))}
                      </select>
                      <span className={`inline-block w-2.5 h-2.5 rounded-full ${ROLE_COLORS[selected.role] || 'bg-gray-400'}`}></span>
                    </div>
                  </div>
                  <button
                    onClick={() => { if (confirm('Delete this character?')) deleteCharacter(selected.id); }}
                    className="p-2 text-gray-400 hover:text-red-500 transition-colors rounded-lg hover:bg-gray-100 dark:hover:bg-gray-800"
                    title="Delete character"
                  >
                    <Trash2 className="w-5 h-5" />
                  </button>
                </div>
              </div>

              {/* Tabs */}
              <div className="border-b border-gray-200 dark:border-gray-800 bg-white dark:bg-gray-900 overflow-x-auto">
                <div className="flex px-4">
                  {PROFILE_TABS.map((tab) => {
                    // Hide genre tab if no genre-specific fields
                    if (tab.id === 'genre' && genreFields.length === 0) return null;
                    return (
                      <button
                        key={tab.id}
                        onClick={() => setActiveTab(tab.id)}
                        className={`flex items-center gap-1.5 px-4 py-3 text-sm font-medium border-b-2 transition-colors whitespace-nowrap ${
                          activeTab === tab.id
                            ? 'border-blue-500 text-blue-600 dark:text-blue-400'
                            : 'border-transparent text-gray-500 dark:text-gray-400 hover:text-gray-700 dark:hover:text-gray-300 hover:border-gray-300 dark:hover:border-gray-600'
                        }`}
                      >
                        
                        {tab.label}
                      </button>
                    );
                  })}
                </div>
              </div>

              {/* Tab Content */}
              <div className="flex-1 overflow-y-auto p-6">
                <div className="max-w-2xl mx-auto space-y-6">
                  {activeTab === 'bio' && (
                    <>
                      <ProfileField label="Full Name" value={selected.name} onChange={(v) => updateCharacter(selected.id, { name: v })} placeholder="Character's full name" />
                      <div className="grid grid-cols-2 gap-4">
                        <ProfileField label="Age" value={selected.age || ''} onChange={(v) => updateCharacter(selected.id, { age: v })} placeholder="e.g., 34, Late 20s" />
                        <ProfileField label="Gender" value={selected.gender || ''} onChange={(v) => updateCharacter(selected.id, { gender: v })} placeholder="e.g., Female, Non-binary" />
                      </div>
                      <ProfileField label="Occupation" value={selected.occupation || ''} onChange={(v) => updateCharacter(selected.id, { occupation: v })} placeholder="What do they do?" />
                      <ProfileField label="Physical Description" value={selected.physicalDescription || ''} onChange={(v) => updateCharacter(selected.id, { physicalDescription: v })} placeholder="Height, build, distinguishing features, how they carry themselves..." multiline />
                      <ProfileField label="Overview" value={selected.description || ''} onChange={(v) => updateCharacter(selected.id, { description: v })} placeholder="A brief summary of who this character is and why they matter to the story..." multiline />
                    </>
                  )}

                  {activeTab === 'personality' && (
                    <>
                      <ProfileField label="Personality" value={selected.personality || ''} onChange={(v) => updateCharacter(selected.id, { personality: v })} placeholder="Core personality traits, temperament, how others perceive them..." multiline />
                      <ProfileField label="Strengths" value={selected.strengths || ''} onChange={(v) => updateCharacter(selected.id, { strengths: v })} placeholder="What are they good at? What makes them admirable?" multiline />
                      <ProfileField label="Flaws" value={selected.flaws || ''} onChange={(v) => updateCharacter(selected.id, { flaws: v })} placeholder="What holds them back? What makes them human?" multiline />
                      <ProfileField label="Fears" value={selected.fears || ''} onChange={(v) => updateCharacter(selected.id, { fears: v })} placeholder="What are they afraid of? Surface fears and deep fears..." multiline />
                      <ProfileField label="Desires" value={selected.desires || ''} onChange={(v) => updateCharacter(selected.id, { desires: v })} placeholder="What do they want more than anything? Conscious and unconscious desires..." multiline />
                    </>
                  )}

                  {activeTab === 'background' && (
                    <>
                      <ProfileField label="Backstory" value={selected.backstory || ''} onChange={(v) => updateCharacter(selected.id, { backstory: v })} placeholder="Key events from their past that shaped who they are today..." multiline />
                    </>
                  )}

                  {activeTab === 'arc' && (
                    <>
                      <ProfileField label="Goals" value={selected.goals || ''} onChange={(v) => updateCharacter(selected.id, { goals: v })} placeholder="What are they trying to achieve in this story?" multiline />
                      <ProfileField label="Motivation" value={selected.motivation || ''} onChange={(v) => updateCharacter(selected.id, { motivation: v })} placeholder="Why do they want what they want?" multiline />
                      <ProfileField label="Internal Conflict" value={selected.internalConflict || ''} onChange={(v) => updateCharacter(selected.id, { internalConflict: v })} placeholder="The war inside them  what belief or desire conflicts with their goal?" multiline />
                      <ProfileField label="External Conflict" value={selected.externalConflict || ''} onChange={(v) => updateCharacter(selected.id, { externalConflict: v })} placeholder="What outside forces oppose them?" multiline />
                      <ProfileField label="Character Arc" value={selected.arc || ''} onChange={(v) => updateCharacter(selected.id, { arc: v })} placeholder="How do they change from beginning to end? What do they learn (or fail to learn)?" multiline />
                    </>
                  )}

                  {activeTab === 'voice' && (
                    <>
                      <ProfileField label="Speech Patterns" value={selected.speechPatterns || ''} onChange={(v) => updateCharacter(selected.id, { speechPatterns: v })} placeholder="How do they talk? Formal, slang, terse, poetic? Catchphrases?" multiline />
                      <ProfileField label="Mannerisms" value={selected.mannerisms || ''} onChange={(v) => updateCharacter(selected.id, { mannerisms: v })} placeholder="Physical habits, gestures, tics, body language..." multiline />
                    </>
                  )}

                  {activeTab === 'genre' && genreFields.length > 0 && (
                    <>
                      <div className="flex items-center gap-2 mb-2">
                        <Sparkles className="w-4 h-4 text-purple-500" />
                        <span className="text-sm font-medium text-purple-600 dark:text-purple-400">
                          {(project?.genre || 'General').charAt(0).toUpperCase() + (project?.genre || 'general').slice(1)} Fields
                        </span>
                      </div>
                      {genreFields.map((field) => (
                        <ProfileField
                          key={field.key}
                          label={field.label}
                          value={selected.genreFields?.[field.key] || ''}
                          onChange={(v) => {
                            const gf = { ...(selected.genreFields || {}), [field.key]: v };
                            updateCharacter(selected.id, { genreFields: gf });
                          }}
                          placeholder={field.placeholder}
                          multiline
                        />
                      ))}
                    </>
                  )}

                  {activeTab === 'relationships' && (
                    <RelationshipEditor
                      relationships={relationships}
                      characters={characters}
                      currentCharacterId={selected.id}
                      onAdd={(rel) => saveRelationships([...relationships, rel])}
                      onRemove={(id) => saveRelationships(relationships.filter(r => r.id !== id))}
                      onUpdate={(id, updates) => saveRelationships(relationships.map(r => r.id === id ? { ...r, ...updates } : r))}
                    />
                  )}

                  {activeTab === 'notes' && (
                    <ProfileField label="Free Notes" value={selected.notes || ''} onChange={(v) => updateCharacter(selected.id, { notes: v })} placeholder="Anything else about this character  research notes, inspiration, deleted scenes, questions to resolve..." multiline />
                  )}
                </div>
              </div>
            </>
          ) : (
            <div className="flex-1 flex items-center justify-center">
              <div className="text-center text-gray-400 dark:text-gray-600">
                <Users className="w-16 h-16 mx-auto mb-4 opacity-30" />
                <p className="text-lg font-medium">Select or create a character</p>
                <p className="text-sm mt-1">Build detailed profiles that bring your characters to life</p>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
