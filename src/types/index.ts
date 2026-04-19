// ============================================================
// ProseCraft Type Definitions
// ============================================================

// --- Core Project Types ---

export interface Project {
  id: string;
  title: string;
  genre: Genre;
  description: string;
  wordCountGoal: number;
  goalDeadline?: string; // ISO date string
  dailyGoal?: number;
  createdAt: Date;
  updatedAt: Date;
}

export type Genre =
  | 'fantasy'
  | 'sci-fi'
  | 'romance'
  | 'thriller'
  | 'mystery'
  | 'horror'
  | 'literary'
  | 'historical'
  | 'general'
  | string; // allow custom genres

export interface Chapter {
  id: string;
  projectId: string;
  title: string;
  sortOrder: number;
  createdAt: Date;
}

export type SceneStatus = 'idea' | 'outline' | 'draft' | 'revised' | 'final';

export interface Scene {
  id: string;
  chapterId: string;
  title: string;
  content: string; // HTML from TipTap
  wordCount: number;
  sortOrder: number;
  povCharacter?: string; // Character ID
  location?: string; // Location ID
  notes?: string;
  status?: SceneStatus;
  tags?: string[];
  color?: string; // card color on corkboard
  createdAt: Date;
  updatedAt: Date;
}

// --- Character Types ---

export interface Character {
  id: string;
  projectId: string;
  name: string;
  role: CharacterRole;
  avatar?: string; // emoji or color code
  // Bio
  age?: string;
  gender?: string;
  occupation?: string;
  physicalDescription?: string;
  // Personality
  personality?: string;
  strengths?: string;
  flaws?: string;
  fears?: string;
  desires?: string;
  // Background
  backstory?: string;
  description?: string;
  // Arc
  goals?: string;
  motivation?: string;
  arc?: string;
  internalConflict?: string;
  externalConflict?: string;
  // Voice
  speechPatterns?: string;
  mannerisms?: string;
  // Genre-specific fields stored as key-value
  genreFields?: Record<string, string>;
  // Custom notes
  notes?: string;
  createdAt?: Date;
  updatedAt?: Date;
}

export type CharacterRole =
  | 'protagonist'
  | 'antagonist'
  | 'deuteragonist'
  | 'mentor'
  | 'love-interest'
  | 'sidekick'
  | 'supporting'
  | 'minor'
  | string;

export interface CharacterRelationship {
  id: string;
  projectId: string;
  characterA: string; // Character ID
  characterB: string; // Character ID
  type: RelationshipType;
  description?: string;
  dynamic?: string; // e.g., "tense", "evolving", "one-sided"
}

export type RelationshipType =
  | 'ally'
  | 'enemy'
  | 'family'
  | 'romantic'
  | 'mentor-mentee'
  | 'rival'
  | 'friend'
  | 'colleague'
  | string;

// --- Genre Template Definitions ---

export interface GenreTemplate {
  genre: Genre;
  label: string;
  characterFields: GenreField[];
  beatSheet: BeatSheetTemplate;
}

export interface GenreField {
  key: string;
  label: string;
  placeholder: string;
  section: 'bio' | 'personality' | 'background' | 'arc' | 'voice' | 'genre';
}

// --- Location / World-Building ---

export interface Location {
  id: string;
  projectId: string;
  name: string;
  description?: string;
  significance?: string; // why it matters to the story
  sensoryDetails?: string; // sights, sounds, smells
  notes?: string;
  parentLocationId?: string; // for nested locations (building â room)
}

// --- Storyboard / Plot Types ---

export interface StoryboardCard {
  id: string;
  projectId: string;
  title: string;
  content: string;
  color: CardColor;
  // Positioning on corkboard
  x?: number;
  y?: number;
  // Linking
  sceneId?: string; // link to a scene
  beatType?: BeatType; // link to a beat
  // Metadata
  tags?: string[];
  sortOrder: number;
  createdAt: Date;
  updatedAt: Date;
}

export type CardColor = 'yellow' | 'blue' | 'green' | 'pink' | 'purple' | 'orange' | 'red' | 'white';

// --- Beat Sheet / Story Structure ---

export type BeatType =
  // Three-Act Structure
  | 'opening'
  | 'inciting-incident'
  | 'first-plot-point'
  | 'rising-action'
  | 'midpoint'
  | 'second-plot-point'
  | 'climax'
  | 'falling-action'
  | 'resolution'
  // Save the Cat additions
  | 'opening-image'
  | 'theme-stated'
  | 'setup'
  | 'catalyst'
  | 'debate'
  | 'break-into-two'
  | 'b-story'
  | 'fun-and-games'
  | 'all-is-lost'
  | 'dark-night'
  | 'break-into-three'
  | 'finale'
  | 'final-image'
  // Hero's Journey additions
  | 'ordinary-world'
  | 'call-to-adventure'
  | 'refusal'
  | 'meeting-mentor'
  | 'crossing-threshold'
  | 'tests-allies-enemies'
  | 'innermost-cave'
  | 'ordeal'
  | 'reward'
  | 'road-back'
  | 'resurrection'
  | 'return-with-elixir'
  // Custom
  | string;

export interface PlotBeat {
  id: string;
  projectId: string;
  beatType: BeatType;
  title: string;
  description: string;
  sceneId?: string; // linked scene
  sortOrder: number;
  completed: boolean;
}

export interface BeatSheetTemplate {
  id: string;
  name: string;
  description: string;
  beats: {
    beatType: BeatType;
    label: string;
    description: string;
    act: number; // 1, 2, or 3
    percentOfStory?: number; // approximate position 0-100
  }[];
}

// --- View Mode Types ---

export type StoryboardViewMode = 'corkboard' | 'list' | 'timeline';

// ============================================================
// Genre Template Data (exported as constants)
// ============================================================

export const GENRE_SPECIFIC_FIELDS: Record<string, GenreField[]> = {
  fantasy: [
    { key: 'magicAbilities', label: 'Magic / Abilities', placeholder: 'What powers or magical abilities does this character have?', section: 'genre' },
    { key: 'species', label: 'Species / Race', placeholder: 'Human, elf, dwarf, etc.', section: 'genre' },
    { key: 'allegiance', label: 'Allegiance / Faction', placeholder: 'Kingdom, guild, order they belong to', section: 'genre' },
    { key: 'prophecy', label: 'Prophecy / Destiny', placeholder: 'Any prophecy or destined role?', section: 'genre' },
  ],
  'sci-fi': [
    { key: 'augmentations', label: 'Augmentations / Tech', placeholder: 'Cybernetic enhancements, AI implants, etc.', section: 'genre' },
    { key: 'species', label: 'Species / Origin', placeholder: 'Human, alien, android, etc.', section: 'genre' },
    { key: 'shipOrStation', label: 'Ship / Station', placeholder: 'Primary vessel or base of operations', section: 'genre' },
    { key: 'faction', label: 'Faction / Corporation', placeholder: 'Government, rebel group, megacorp, etc.', section: 'genre' },
  ],
  romance: [
    { key: 'loveLanguage', label: 'Love Language', placeholder: 'Words of affirmation, acts of service, etc.', section: 'genre' },
    { key: 'attachmentStyle', label: 'Attachment Style', placeholder: 'Secure, anxious, avoidant, etc.', section: 'genre' },
    { key: 'dealbreakers', label: 'Dealbreakers', placeholder: 'What will they not tolerate in a partner?', section: 'genre' },
    { key: 'romanticHistory', label: 'Romantic History', placeholder: 'Past relationships, heartbreaks, patterns', section: 'genre' },
  ],
  thriller: [
    { key: 'secrets', label: 'Secrets', placeholder: 'What are they hiding?', section: 'genre' },
    { key: 'skills', label: 'Combat / Tactical Skills', placeholder: 'Fighting, weapons, surveillance, hacking', section: 'genre' },
    { key: 'vulnerabilities', label: 'Vulnerabilities', placeholder: 'Exploitable weaknesses, pressure points', section: 'genre' },
    { key: 'alibi', label: 'Alibi / Cover', placeholder: 'False identity, cover story', section: 'genre' },
  ],
  mystery: [
    { key: 'secrets', label: 'Secrets', placeholder: 'What are they hiding?', section: 'genre' },
    { key: 'motive', label: 'Motive', placeholder: 'What would drive them to commit or solve the crime?', section: 'genre' },
    { key: 'alibi', label: 'Alibi', placeholder: 'Where were they when it happened?', section: 'genre' },
    { key: 'cluesLinked', label: 'Linked Clues', placeholder: 'What evidence connects to this character?', section: 'genre' },
  ],
  horror: [
    { key: 'deepestFear', label: 'Deepest Fear', placeholder: 'The primal fear that defines them', section: 'genre' },
    { key: 'survivalInstinct', label: 'Survival Instinct', placeholder: 'Fight, flight, freeze, or fawn?', section: 'genre' },
    { key: 'darkSecret', label: 'Dark Secret', placeholder: 'Something that makes them vulnerable to the horror', section: 'genre' },
    { key: 'connection', label: 'Connection to Evil', placeholder: 'How are they tied to the threat?', section: 'genre' },
  ],
  literary: [
    { key: 'worldview', label: 'Worldview', placeholder: 'How do they see the world? Optimist, nihilist, pragmatist?', section: 'genre' },
    { key: 'centralTension', label: 'Central Tension', placeholder: 'The core internal contradiction they live with', section: 'genre' },
    { key: 'symbolism', label: 'Symbolic Resonance', placeholder: 'Objects, images, or motifs associated with this character', section: 'genre' },
    { key: 'epiphany', label: 'Epiphany / Realization', placeholder: 'The truth they come to understand (or fail to)', section: 'genre' },
  ],
  historical: [
    { key: 'historicalPeriod', label: 'Historical Period', placeholder: 'Specific era and date range', section: 'genre' },
    { key: 'socialClass', label: 'Social Class / Status', placeholder: 'Nobility, merchant, peasant, soldier, etc.', section: 'genre' },
    { key: 'historicalEvents', label: 'Historical Events', placeholder: 'Real events that shape their story', section: 'genre' },
    { key: 'periodAccuracy', label: 'Period-Specific Details', placeholder: 'Clothing, speech, customs, beliefs of the era', section: 'genre' },
  ],
};

export const CHARACTER_ROLE_OPTIONS: { value: CharacterRole; label: string; description: string }[] = [
  { value: 'protagonist', label: 'Protagonist', description: 'The main character driving the story' },
  { value: 'antagonist', label: 'Antagonist', description: 'The primary opposition' },
  { value: 'deuteragonist', label: 'Deuteragonist', description: 'The secondary main character' },
  { value: 'mentor', label: 'Mentor', description: 'Guide or teacher figure' },
  { value: 'love-interest', label: 'Love Interest', description: 'Romantic counterpart' },
  { value: 'sidekick', label: 'Sidekick', description: 'Close companion to the protagonist' },
  { value: 'supporting', label: 'Supporting', description: 'Important but secondary role' },
  { value: 'minor', label: 'Minor', description: 'Brief or background appearances' },
];

// --- Story Intelligence Types ---

export type ArcPhase = 'setup' | 'rising' | 'crisis' | 'climax' | 'resolution';

export interface CharacterChapterPresence {
  characterId: string;
  chapterId: string;
  role: 'pov' | 'active' | 'mentioned' | 'absent';
  arcPhase?: ArcPhase;
  notes?: string;
}

export interface StoryThread {
  id: string;
  projectId: string;
  name: string;
  color: string; // hex color for UI
  type: 'plot' | 'character' | 'theme' | 'subplot';
  status: 'active' | 'resolved' | 'dropped';
  introducedChapterId?: string;
  resolvedChapterId?: string;
  linkedBeatTypes?: BeatType[];
  linkedCharacterIds?: string[];
  description?: string;
  createdAt: Date;
}

export interface ConsistencyAlert {
  id: string;
  type: 'character-drift' | 'plot-hole' | 'thread-dropped' | 'arc-stall' | 'beat-missing' | 'pacing';
  severity: 'info' | 'warning' | 'critical';
  title: string;
  description: string;
  relatedCharacterId?: string;
  relatedChapterId?: string;
  relatedBeatType?: BeatType;
  relatedThreadId?: string;
  dismissed?: boolean;
}

export interface StoryContext {
  // Current position in story
  totalChapters: number;
  currentChapterIndex: number;
  progressPercent: number;
  totalWordCount: number;

  // Characters active at this point
  activeCharacters: {
    character: Character;
    arcPhase: ArcPhase;
    lastSeenChapter: string;
    chaptersSinceLastAppearance: number;
  }[];

  // Beat alignment
  currentBeat: {
    beatType: BeatType;
    label: string;
    description: string;
    percentOfStory: number;
  } | null;
  nextBeat: {
    beatType: BeatType;
    label: string;
    description: string;
    percentOfStory: number;
  } | null;
  completedBeats: PlotBeat[];
  upcomingBeats: { beatType: BeatType; label: string; description: string; percentOfStory: number }[];

  // Active threads
  activeThreads: StoryThread[];
  resolvedThreads: StoryThread[];

  // Alerts
  alerts: ConsistencyAlert[];

  // For AI context injection
  narrativeSummary: string;
}

export const BEAT_SHEET_TEMPLATES: BeatSheetTemplate[] = [
  {
    id: 'three-act',
    name: 'Three-Act Structure',
    description: 'The classic beginning, middle, and end framework',
    beats: [
      { beatType: 'opening', label: 'Opening', description: 'Introduce the protagonist and their ordinary world', act: 1, percentOfStory: 0 },
      { beatType: 'inciting-incident', label: 'Inciting Incident', description: 'The event that disrupts the status quo', act: 1, percentOfStory: 10 },
      { beatType: 'first-plot-point', label: 'First Plot Point', description: 'The protagonist commits to the journey', act: 1, percentOfStory: 25 },
      { beatType: 'rising-action', label: 'Rising Action', description: 'Escalating challenges and complications', act: 2, percentOfStory: 35 },
      { beatType: 'midpoint', label: 'Midpoint', description: 'A major shift \u2014 false victory or false defeat', act: 2, percentOfStory: 50 },
      { beatType: 'second-plot-point', label: 'Second Plot Point', description: 'The final piece falls into place for the climax', act: 2, percentOfStory: 75 },
      { beatType: 'climax', label: 'Climax', description: 'The highest point of tension \u2014 the main confrontation', act: 3, percentOfStory: 85 },
      { beatType: 'falling-action', label: 'Falling Action', description: 'Consequences of the climax unfold', act: 3, percentOfStory: 90 },
      { beatType: 'resolution', label: 'Resolution', description: 'The new normal \u2014 how the world has changed', act: 3, percentOfStory: 100 },
    ],
  },
  {
    id: 'save-the-cat',
    name: 'Save the Cat',
    description: 'Blake Snyder\'s 15-beat structure for compelling storytelling',
    beats: [
      { beatType: 'opening-image', label: 'Opening Image', description: 'A visual that sets the tone and shows the "before"', act: 1, percentOfStory: 0 },
      { beatType: 'theme-stated', label: 'Theme Stated', description: 'Someone states the theme (the hero doesn\'t get it yet)', act: 1, percentOfStory: 5 },
      { beatType: 'setup', label: 'Setup', description: 'Introduce the hero, their world, and what\'s missing', act: 1, percentOfStory: 10 },
      { beatType: 'catalyst', label: 'Catalyst', description: 'The moment that changes everything', act: 1, percentOfStory: 12 },
      { beatType: 'debate', label: 'Debate', description: 'The hero hesitates \u2014 should they go on this journey?', act: 1, percentOfStory: 15 },
      { beatType: 'break-into-two', label: 'Break Into Two', description: 'The hero decides to act and enters the new world', act: 2, percentOfStory: 25 },
      { beatType: 'b-story', label: 'B Story', description: 'A new character or subplot that carries the theme', act: 2, percentOfStory: 30 },
      { beatType: 'fun-and-games', label: 'Fun and Games', description: 'The promise of the premise \u2014 what the audience came for', act: 2, percentOfStory: 35 },
      { beatType: 'midpoint', label: 'Midpoint', description: 'False victory or false defeat that raises stakes', act: 2, percentOfStory: 50 },
      { beatType: 'rising-action', label: 'Bad Guys Close In', description: 'External pressures mount, internal doubts grow', act: 2, percentOfStory: 60 },
      { beatType: 'all-is-lost', label: 'All Is Lost', description: 'The lowest point \u2014 something or someone is lost', act: 2, percentOfStory: 75 },
      { beatType: 'dark-night', label: 'Dark Night of the Soul', description: 'The hero wallows in hopelessness before finding clarity', act: 2, percentOfStory: 80 },
      { beatType: 'break-into-three', label: 'Break Into Three', description: 'The solution is found \u2014 A and B stories cross', act: 3, percentOfStory: 80 },
      { beatType: 'finale', label: 'Finale', description: 'The hero proves they\'ve changed by applying the lesson', act: 3, percentOfStory: 85 },
      { beatType: 'final-image', label: 'Final Image', description: 'Mirror of the opening \u2014 shows the transformation', act: 3, percentOfStory: 100 },
    ],
  },
  {
    id: 'heros-journey',
    name: "Hero's Journey",
    description: "Joseph Campbell's monomyth adapted for fiction writing",
    beats: [
      { beatType: 'ordinary-world', label: 'Ordinary World', description: 'The hero in their everyday life before the adventure', act: 1, percentOfStory: 0 },
      { beatType: 'call-to-adventure', label: 'Call to Adventure', description: 'A challenge, quest, or problem presents itself', act: 1, percentOfStory: 10 },
      { beatType: 'refusal', label: 'Refusal of the Call', description: 'The hero hesitates or refuses the challenge', act: 1, percentOfStory: 15 },
      { beatType: 'meeting-mentor', label: 'Meeting the Mentor', description: 'The hero encounters a guide or gains confidence', act: 1, percentOfStory: 20 },
      { beatType: 'crossing-threshold', label: 'Crossing the Threshold', description: 'The hero leaves the known world behind', act: 1, percentOfStory: 25 },
      { beatType: 'tests-allies-enemies', label: 'Tests, Allies, Enemies', description: 'The hero faces challenges and makes friends and foes', act: 2, percentOfStory: 35 },
      { beatType: 'innermost-cave', label: 'Approach to the Innermost Cave', description: 'Preparations for the major challenge ahead', act: 2, percentOfStory: 50 },
      { beatType: 'ordeal', label: 'The Ordeal', description: 'The hero faces their greatest test \u2014 death and rebirth', act: 2, percentOfStory: 60 },
      { beatType: 'reward', label: 'Reward (Seizing the Sword)', description: 'The hero takes possession of the treasure or insight', act: 2, percentOfStory: 70 },
      { beatType: 'road-back', label: 'The Road Back', description: 'The hero begins the return, often chased or tempted', act: 3, percentOfStory: 80 },
      { beatType: 'resurrection', label: 'Resurrection', description: 'A final test where the hero must use everything learned', act: 3, percentOfStory: 90 },
      { beatType: 'return-with-elixir', label: 'Return with the Elixir', description: 'The hero returns transformed, bearing wisdom or treasure', act: 3, percentOfStory: 100 },
    ],
  },
];
