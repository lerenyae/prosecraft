'use client';

import { useState, useRef, useEffect, useCallback } from 'react';
import {
  Send,
  Loader2,
  Trash2,
  RefreshCw,
  Copy,
  Check,
  Brain,
  X,
  Plus,
  ChevronDown,
  ChevronUp,
} from 'lucide-react';
import { useStore } from '@/lib/store';

// ============================================================================
// Types
// ============================================================================

interface ChatMessage {
  role: 'user' | 'assistant';
  content: string;
  timestamp: number;
}

interface MemoryEntry {
  id: string;
  text: string;
  createdAt: number;
  source: 'auto' | 'manual';
}

// ============================================================================
// LocalStorage Helpers
// ============================================================================

function loadChatHistory(chapterId: string): ChatMessage[] {
  if (typeof window === 'undefined') return [];
  try {
    const stored = localStorage.getItem(`prosecraft-chat-${chapterId}`);
    return stored ? JSON.parse(stored) : [];
  } catch {
    return [];
  }
}

function saveChatHistory(chapterId: string, messages: ChatMessage[]): void {
  if (typeof window === 'undefined') return;
  try {
    localStorage.setItem(`prosecraft-chat-${chapterId}`, JSON.stringify(messages));
  } catch { /* noop */ }
}

function loadMemoryBank(projectId: string): MemoryEntry[] {
  if (typeof window === 'undefined') return [];
  try {
    const stored = localStorage.getItem(`prosecraft-memory-${projectId}`);
    return stored ? JSON.parse(stored) : [];
  } catch {
    return [];
  }
}

function saveMemoryBank(projectId: string, entries: MemoryEntry[]): void {
  if (typeof window === 'undefined') return;
  try {
    localStorage.setItem(`prosecraft-memory-${projectId}`, JSON.stringify(entries));
  } catch { /* noop */ }
}

function generateId(): string {
  return Date.now().toString(36) + Math.random().toString(36).slice(2, 8);
}

// ============================================================================
// Helpers
// ============================================================================

function stripHtml(html: string): string {
  return html
    .replace(/<[^>]+>/g, '')
    .replace(/&nbsp;/g, ' ')
    .replace(/&amp;/g, '&')
    .replace(/&lt;/g, '<')
    .replace(/&gt;/g, '>')
    .replace(/\s+/g, ' ')
    .trim();
}

function renderMarkdown(text: string): string {
  let html = text
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/\*\*(.+?)\*\*/g, '<strong>$1</strong>')
    .replace(/__(.+?)__/g, '<strong>$1</strong>')
    .replace(/(?<![\w*])\*([^*]+?)\*(?![\w*])/g, '<em>$1</em>')
    .replace(/(?<![\w_])_([^_]+?)_(?![\w_])/g, '<em>$1</em>')
    .replace(
      /`([^`]+?)`/g,
      '<code class="px-1 py-0.5 rounded bg-[var(--color-surface-alt)] text-[11px] font-mono">$1</code>'
    )
    .replace(/\n/g, '<br/>');
  return html;
}

// ============================================================================
// Memory Bank Panel
// ============================================================================

interface MemoryBankProps {
  projectId: string;
  memories: MemoryEntry[];
  onUpdate: (memories: MemoryEntry[]) => void;
  isOpen: boolean;
  onToggle: () => void;
}

function MemoryBank({ projectId, memories, onUpdate, isOpen, onToggle }: MemoryBankProps) {
  const [newMemory, setNewMemory] = useState('');
  const [isAdding, setIsAdding] = useState(false);

  const addMemory = () => {
    if (!newMemory.trim()) return;
    const entry: MemoryEntry = {
      id: generateId(),
      text: newMemory.trim(),
      createdAt: Date.now(),
      source: 'manual',
    };
    const updated = [...memories, entry];
    onUpdate(updated);
    saveMemoryBank(projectId, updated);
    setNewMemory('');
    setIsAdding(false);
  };

  const removeMemory = (id: string) => {
    const updated = memories.filter(m => m.id !== id);
    onUpdate(updated);
    saveMemoryBank(projectId, updated);
  };

  return (
    <div className="border-b border-[var(--color-border)]">
      <button
        onClick={onToggle}
        className="w-full flex items-center justify-between px-3 py-2 text-left hover:bg-[var(--color-surface-alt)] transition-colors"
      >
        <div className="flex items-center gap-1.5">
          <Brain size={12} className="text-[var(--color-accent)]" />
          <span className="text-[10px] font-semibold text-[var(--color-text-secondary)] uppercase tracking-wide">
            Project Memory
          </span>
          {memories.length > 0 && (
            <span className="text-[9px] text-[var(--color-text-muted)] bg-[var(--color-surface-alt)] px-1.5 py-0.5 rounded-full">
              {memories.length}
            </span>
          )}
        </div>
        {isOpen ? <ChevronUp size={12} className="text-[var(--color-text-muted)]" /> : <ChevronDown size={12} className="text-[var(--color-text-muted)]" />}
      </button>

      {isOpen && (
        <div className="px-3 pb-2">
          {memories.length === 0 && !isAdding && (
            <p className="text-[10px] text-[var(--color-text-muted)] py-1">
              No memories yet. AI will auto-learn from your conversations, or add your own.
            </p>
          )}

          {/* Memory entries */}
          <div className="flex flex-col gap-1 max-h-[120px] overflow-y-auto">
            {memories.map(mem => (
              <div
                key={mem.id}
                className="group flex items-start gap-1.5 text-[10px] text-[var(--color-text-secondary)] py-0.5"
              >
                <span className={`flex-shrink-0 mt-0.5 w-1.5 h-1.5 rounded-full ${
                  mem.source === 'auto' ? 'bg-[var(--color-accent)]' : 'bg-[var(--color-text-muted)]'
                }`} />
                <span className="flex-1 leading-relaxed">{mem.text}</span>
                <button
                  onClick={() => removeMemory(mem.id)}
                  className="flex-shrink-0 opacity-0 group-hover:opacity-100 p-0.5 rounded text-[var(--color-text-muted)] hover:text-red-500 transition-all"
                >
                  <X size={10} />
                </button>
              </div>
            ))}
          </div>

          {/* Add memory input */}
          {isAdding ? (
            <div className="flex items-center gap-1 mt-1">
              <input
                type="text"
                value={newMemory}
                onChange={e => setNewMemory(e.target.value)}
                onKeyDown={e => { if (e.key === 'Enter') addMemory(); if (e.key === 'Escape') setIsAdding(false); }}
                placeholder="e.g. Main character's name is Marcus"
                autoFocus
                className="flex-1 text-[10px] bg-[var(--color-surface)] border border-[var(--color-border)] rounded px-2 py-1 text-[var(--color-text-primary)] placeholder:text-[var(--color-text-muted)] outline-none focus:border-[var(--color-accent)]"
              />
              <button onClick={addMemory} className="p-1 rounded text-[var(--color-accent)] hover:bg-[var(--color-surface-alt)]">
                <Check size={12} />
              </button>
              <button onClick={() => { setIsAdding(false); setNewMemory(''); }} className="p-1 rounded text-[var(--color-text-muted)] hover:bg-[var(--color-surface-alt)]">
                <X size={12} />
              </button>
            </div>
          ) : (
            <button
              onClick={() => setIsAdding(true)}
              className="flex items-center gap-1 text-[10px] text-[var(--color-text-muted)] hover:text-[var(--color-accent)] mt-1 transition-colors"
            >
              <Plus size={10} />
              Add memory
            </button>
          )}
        </div>
      )}
    </div>
  );
}

// ============================================================================
// Chat Panel Component
// ============================================================================

export default function ChatPanel() {
  const {
    currentProject,
    currentChapter,
    projectChapters,
    chapterScenes,
  } = useStore();

  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [memories, setMemories] = useState<MemoryEntry[]>([]);
  const [input, setInput] = useState('');
  const [loading, setLoading] = useState(false);
  const [contextRefreshed, setContextRefreshed] = useState(false);
  const [copiedIndex, setCopiedIndex] = useState<number | null>(null);
  const [memoryOpen, setMemoryOpen] = useState(false);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const textareaRef = useRef<HTMLTextAreaElement>(null);

  const chapter = currentChapter || projectChapters[0];
  const chapterId = chapter?.id || '';
  const projectId = currentProject?.id || '';

  // Load chat history from localStorage when chapter changes
  useEffect(() => {
    if (chapterId) {
      const stored = loadChatHistory(chapterId);
      setMessages(stored);
    } else {
      setMessages([]);
    }
  }, [chapterId]);

  // Load memory bank when project changes
  useEffect(() => {
    if (projectId) {
      const stored = loadMemoryBank(projectId);
      setMemories(stored);
    } else {
      setMemories([]);
    }
  }, [projectId]);

  // Auto-scroll to bottom on new messages
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages.length]);

  // Auto-resize textarea
  useEffect(() => {
    if (textareaRef.current) {
      textareaRef.current.style.height = 'auto';
      textareaRef.current.style.height = Math.min(textareaRef.current.scrollHeight, 120) + 'px';
    }
  }, [input]);

  const getChapterContent = useCallback(() => {
    if (!chapter) return '';
    const scenes = chapterScenes(chapter.id);
    return scenes.map(s => s.content || '').join('\n\n');
  }, [chapter, chapterScenes]);

  const copyToClipboard = useCallback(async (text: string, index: number) => {
    try {
      await navigator.clipboard.writeText(text);
      setCopiedIndex(index);
      setTimeout(() => setCopiedIndex(null), 2000);
    } catch { /* fallback */ }
  }, []);

  // Auto-extract memories from AI responses
  const extractMemories = useCallback((assistantResponse: string) => {
    if (!projectId) return;

    // Simple heuristic: look for patterns that indicate character/plot facts
    const patterns = [
      /(?:the )?protagonist(?:'s name)? is (\w+)/i,
      /(?:the )?main character(?:'s name)? is (\w+)/i,
      /(?:the )?story (?:is set|takes place) in (.+?)(?:\.|$)/i,
      /(?:the )?narrative (?:voice|pov|perspective) is (.+?)(?:\.|$)/i,
    ];

    const currentMemoryTexts = memories.map(m => m.text.toLowerCase());
    const newMemories: MemoryEntry[] = [];

    for (const pattern of patterns) {
      const match = assistantResponse.match(pattern);
      if (match && match[1]) {
        const fact = match[0].trim();
        // Don't add duplicates
        if (!currentMemoryTexts.some(t => t.includes(match[1].toLowerCase()))) {
          newMemories.push({
            id: generateId(),
            text: fact,
            createdAt: Date.now(),
            source: 'auto',
          });
        }
      }
    }

    if (newMemories.length > 0) {
      const updated = [...memories, ...newMemories];
      setMemories(updated);
      saveMemoryBank(projectId, updated);
    }
  }, [projectId, memories]);

  const sendMessage = useCallback(async () => {
    if (!input.trim() || loading || !currentProject || !chapter) return;

    const userMessage: ChatMessage = {
      role: 'user',
      content: input.trim(),
      timestamp: Date.now(),
    };

    const updatedMessages = [...messages, userMessage];
    setMessages(updatedMessages);
    saveChatHistory(chapterId, updatedMessages);
    setInput('');
    setLoading(true);
    setContextRefreshed(false);

    try {
      const chapterIndex = projectChapters.findIndex(ch => ch.id === chapter.id);
      const position = projectChapters.length > 1
        ? `chapter ${chapterIndex + 1} of ${projectChapters.length}`
        : undefined;

      // Build memory context string
      const memoryContext = memories.length > 0
        ? memories.map(m => m.text).join('; ')
        : undefined;

      const res = await fetch('/api/ai/chat', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          messages: updatedMessages.map(m => ({ role: m.role, content: m.content })),
          chapterContent: getChapterContent(),
          chapterTitle: chapter.title,
          genre: currentProject.genre,
          chapterPosition: position,
          memoryContext,
        }),
      });

      if (res.ok) {
        const data = await res.json();
        const assistantMessage: ChatMessage = {
          role: 'assistant',
          content: data.response,
          timestamp: Date.now(),
        };

        const withResponse = [...updatedMessages, assistantMessage];
        setMessages(withResponse);
        saveChatHistory(chapterId, withResponse);

        // Try to auto-extract memories
        extractMemories(data.response);
      }
    } catch {
      // silent fail
    } finally {
      setLoading(false);
    }
  }, [input, loading, currentProject, chapter, chapterId, messages, projectChapters, getChapterContent, memories, extractMemories]);

  const refreshContext = useCallback(() => {
    setContextRefreshed(true);
    setTimeout(() => setContextRefreshed(false), 2000);
  }, []);

  const clearChat = useCallback(() => {
    setMessages([]);
    saveChatHistory(chapterId, []);
  }, [chapterId]);

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      sendMessage();
    }
  };

  if (!currentProject || !chapter) {
    return (
      <div className="flex items-center justify-center h-full p-4">
        <p className="text-sm text-[var(--color-text-muted)]">Select a chapter to start chatting.</p>
      </div>
    );
  }

  const chapterIndex = projectChapters.findIndex(ch => ch.id === chapter.id);
  const chapterLabel = `Ch. ${chapterIndex + 1}: ${chapter.title}`;
  const wordCount = stripHtml(getChapterContent()).split(/\s+/).filter(w => w.length > 0).length;

  return (
    <div className="flex flex-col h-full">
      {/* Chapter context header */}
      <div className="flex items-center justify-between px-3 py-2 border-b border-[var(--color-border)] flex-shrink-0">
        <div className="flex-1 min-w-0">
          <p className="text-[11px] font-medium text-[var(--color-text-secondary)] truncate">{chapterLabel}</p>
          <p className="text-[10px] text-[var(--color-text-muted)]">{wordCount.toLocaleString()} words</p>
        </div>
        <div className="flex items-center gap-1">
          <button
            onClick={refreshContext}
            title="Re-read chapter (refreshes AI context)"
            className={`p-1.5 rounded-md transition-colors ${
              contextRefreshed
                ? 'text-emerald-500 bg-emerald-500/10'
                : 'text-[var(--color-text-muted)] hover:text-[var(--color-text-secondary)] hover:bg-[var(--color-surface-alt)]'
            }`}
          >
            <RefreshCw size={13} />
          </button>
          {messages.length > 0 && (
            <button
              onClick={clearChat}
              title="Clear chat history"
              className="p-1.5 rounded-md text-[var(--color-text-muted)] hover:text-red-500 hover:bg-red-500/10 transition-colors"
            >
              <Trash2 size={13} />
            </button>
          )}
        </div>
      </div>

      {/* Project Memory Bank */}
      <MemoryBank
        projectId={projectId}
        memories={memories}
        onUpdate={setMemories}
        isOpen={memoryOpen}
        onToggle={() => setMemoryOpen(!memoryOpen)}
      />

      {/* Messages area */}
      <div className="flex-1 overflow-y-auto px-3 py-3">
        {messages.length === 0 ? (
          <div className="flex flex-col items-center justify-center h-full text-center gap-2">
            <p className="text-sm text-[var(--color-text-muted)]">Ask anything about this chapter.</p>
            <div className="flex flex-wrap gap-1.5 justify-center max-w-[260px]">
              {[
                'How is the pacing?',
                'Strengthen the opening',
                'Find weak dialogue',
                'Trim this chapter',
              ].map(suggestion => (
                <button
                  key={suggestion}
                  onClick={() => {
                    setInput(suggestion);
                  }}
                  className="text-[10px] px-2 py-1 rounded-md bg-[var(--color-surface)] border border-[var(--color-border)] text-[var(--color-text-secondary)] hover:bg-[var(--color-surface-alt)] hover:border-[var(--color-accent)] transition-colors"
                >
                  {suggestion}
                </button>
              ))}
            </div>
          </div>
        ) : (
          <div className="flex flex-col gap-3">
            {messages.map((msg, i) => (
              <div
                key={i}
                className={`flex ${msg.role === 'user' ? 'justify-end' : 'justify-start'}`}
              >
                <div
                  className={`group relative max-w-[90%] rounded-lg px-3 py-2 text-[12px] leading-relaxed ${
                    msg.role === 'user'
                      ? 'bg-[var(--color-accent)] text-white rounded-br-sm'
                      : 'bg-[var(--color-surface)] border border-[var(--color-border)] text-[var(--color-text-primary)] rounded-bl-sm'
                  }`}
                >
                  {msg.role === 'assistant' ? (
                    <div
                      className="prose-chat break-words"
                      dangerouslySetInnerHTML={{ __html: renderMarkdown(msg.content) }}
                    />
                  ) : (
                    <div className="whitespace-pre-wrap break-words">{msg.content}</div>
                  )}

                  {msg.role === 'assistant' && (
                    <button
                      onClick={() => copyToClipboard(msg.content, i)}
                      className="absolute top-1.5 right-1.5 p-1 rounded opacity-0 group-hover:opacity-100 transition-opacity bg-[var(--color-surface-alt)] hover:bg-[var(--color-border)] text-[var(--color-text-muted)]"
                      title="Copy response"
                    >
                      {copiedIndex === i ? (
                        <Check size={11} className="text-emerald-500" />
                      ) : (
                        <Copy size={11} />
                      )}
                    </button>
                  )}
                </div>
              </div>
            ))}

            {loading && (
              <div className="flex justify-start">
                <div className="bg-[var(--color-surface)] border border-[var(--color-border)] rounded-lg px-3 py-2 rounded-bl-sm">
                  <Loader2 size={14} className="animate-spin text-[var(--color-accent)]" />
                </div>
              </div>
            )}
            <div ref={messagesEndRef} />
          </div>
        )}
      </div>

      {/* Input area */}
      <div className="flex-shrink-0 border-t border-[var(--color-border)] p-2">
        <div className="flex items-end gap-1.5 bg-[var(--color-surface)] border border-[var(--color-border)] rounded-lg px-2.5 py-1.5 focus-within:border-[var(--color-accent)] transition-colors">
          <textarea
            ref={textareaRef}
            value={input}
            onChange={e => setInput(e.target.value)}
            onKeyDown={handleKeyDown}
            placeholder="Ask about this chapter..."
            rows={1}
            className="flex-1 bg-transparent text-[12px] text-[var(--color-text-primary)] placeholder:text-[var(--color-text-muted)] resize-none outline-none leading-relaxed max-h-[120px]"
          />
          <button
            onClick={sendMessage}
            disabled={!input.trim() || loading}
            className={`flex-shrink-0 p-1.5 rounded-md transition-colors ${
              input.trim() && !loading
                ? 'text-[var(--color-accent)] hover:bg-[var(--color-accent)]/10'
                : 'text-[var(--color-text-muted)] cursor-not-allowed'
            }`}
          >
            <Send size={14} />
          </button>
        </div>
        <p className="text-[9px] text-[var(--color-text-muted)] mt-1 px-1">
          Shift+Enter for new line. AI reads the full chapter each message.
          {memories.length > 0 && ` ${memories.length} memories loaded.`}
        </p>
      </div>
    </div>
  );
}
