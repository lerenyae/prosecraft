'use client';

import { useState, useRef, useEffect, useCallback } from 'react';
import { Send, Loader2, Trash2, RefreshCw } from 'lucide-react';
import { useStore } from '@/lib/store';

interface ChatMessage {
  role: 'user' | 'assistant';
  content: string;
  timestamp: number;
}

function stripHtml(html: string): string {
  return html.replace(/<[^>]+>/g, '').replace(/&nbsp;/g, ' ').replace(/&amp;/g, '&').replace(/&lt;/g, '<').replace(/&gt;/g, '>').replace(/\s+/g, ' ').trim();
}

export default function ChatPanel() {
  const {
    currentProject,
    currentChapter,
    projectChapters,
    chapterScenes,
  } = useStore();

  const [chapterChats, setChapterChats] = useState<Record<string, ChatMessage[]>>({});
  const [input, setInput] = useState('');
  const [loading, setLoading] = useState(false);
  const [contextRefreshed, setContextRefreshed] = useState(false);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const textareaRef = useRef<HTMLTextAreaElement>(null);

  const chapter = currentChapter || projectChapters[0];
  const chapterId = chapter?.id || '';
  const messages = chapterChats[chapterId] || [];

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

  const sendMessage = useCallback(async () => {
    if (!input.trim() || loading || !currentProject || !chapter) return;

    const userMessage: ChatMessage = {
      role: 'user',
      content: input.trim(),
      timestamp: Date.now(),
    };

    const updatedMessages = [...messages, userMessage];
    setChapterChats(prev => ({ ...prev, [chapterId]: updatedMessages }));
    setInput('');
    setLoading(true);
    setContextRefreshed(false);

    try {
      const chapterIndex = projectChapters.findIndex(ch => ch.id === chapter.id);
      const position = projectChapters.length > 1
        ? `chapter ${chapterIndex + 1} of ${projectChapters.length}`
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
        }),
      });

      if (res.ok) {
        const data = await res.json();
        const assistantMessage: ChatMessage = {
          role: 'assistant',
          content: data.response,
          timestamp: Date.now(),
        };
        setChapterChats(prev => ({
          ...prev,
          [chapterId]: [...updatedMessages, assistantMessage],
        }));
      }
    } catch {
      // silent fail
    } finally {
      setLoading(false);
    }
  }, [input, loading, currentProject, chapter, chapterId, messages, projectChapters, getChapterContent]);

  const refreshContext = useCallback(() => {
    setContextRefreshed(true);
    setTimeout(() => setContextRefreshed(false), 2000);
  }, []);

  const clearChat = useCallback(() => {
    setChapterChats(prev => ({ ...prev, [chapterId]: [] }));
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
            <RefreshCw size={13} className={contextRefreshed ? '' : ''} />
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

      {/* Messages area */}
      <div className="flex-1 overflow-y-auto px-3 py-3">
        {messages.length === 0 ? (
          <div className="flex flex-col items-center justify-center h-full text-center gap-2">
            <p className="text-sm text-[var(--color-text-muted)]">Ask anything about this chapter.</p>
            <div className="flex flex-wrap gap-1.5 justify-center max-w-[260px]">
              {[
                'How\'s the pacing?',
                'Strengthen the opening',
                'Find weak dialogue',
                'Trim this chapter',
              ].map(suggestion => (
                <button
                  key={suggestion}
                  onClick={() => { setInput(suggestion); }}
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
                  className={`max-w-[90%] rounded-lg px-3 py-2 text-[12px] leading-relaxed ${
                    msg.role === 'user'
                      ? 'bg-[var(--color-accent)] text-white rounded-br-sm'
                      : 'bg-[var(--color-surface)] border border-[var(--color-border)] text-[var(--color-text-primary)] rounded-bl-sm'
                  }`}
                >
                  <div className="whitespace-pre-wrap break-words">{msg.content}</div>
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
        </p>
      </div>
    </div>
  );
}
