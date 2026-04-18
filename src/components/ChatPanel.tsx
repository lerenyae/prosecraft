'use client';

import { useState, useRef, useEffect, useCallback } from 'react';
import { Send, Loader2, Trash2, RefreshCw } from 'lucide-react';
import { useStore } from '@/lib/store';

interface ChatMessage {
  role: 'user' | 'assistant';
  content: string;
  timestamp: number;
}

interface ChapterChat {
  chapterId: string;
  messages: ChatMessage[];
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
�۝^�Y��\�Y��	�^Y[Y\�[ML��Y[Y\�[ML�L	�	�^Vݘ\�KX��܋]^[]]Y
WHݙ\��^Vݘ\�KX��܋]^\�X�ۙ\�JWHݙ\����Vݘ\�KX��܋\�\��X�KX[
WIXB����Y��\����^�O^�L�H�\�Ә[YO^��۝^�Y��\�Y�	���	��Hς�؝]ۏ���Y\��Y�\˛[���	��
��]ۂ�ې�X��^��X\��]B�]OH��X\��]\�ܞH���\�Ә[YOH�LK�H��[�Y[Y^Vݘ\�KX��܋]^[]]Y
WHݙ\��^\�YMLݙ\����\�YML�L�[��][ۋX��ܜȂ����\���^�O^�L�Hς�؝]ۏ��
_B��]����]�����ʈY\��Y�\�\�XH
��B�]��\�Ә[YOH��^LHݙ\����^KX]]�L�KLȏ���Y\��Y�\˛[��OOH�
�]��\�Ә[YOH��^�^X��][\�X�[�\��\�Y�KX�[�\�Y�[^X�[�\��\L�����\�Ә[YOH�^\�H^Vݘ\�KX��܋]^[]]Y
WH��\��[�][��X��]\��\\�����]��\�Ә[YOH��^�^]ܘ\�\LK�H�\�Y�KX�[�\�X^]�V̍�H����	���	��HX�[�����	���[��[�H�[�[����	њ[��XZ�X[��YI��	��[H\��\\���K�X\
�Y��\�[ۈO�
��]ۂ��^O^��Y��\�[۟B�ې�X��^�
HO���][�]
�Y��\�[ۊN�_B��\�Ә[YOH�^V�LHL�KLH��[�Y[Y��Vݘ\�KX��܋\�\��X�JWH�ܙ\��ܙ\�Vݘ\�KX��܋X�ܙ\�WH^Vݘ\�KX��܋]^\�X�ۙ\�JWHݙ\����Vݘ\�KX��܋\�\��X�KX[
WHݙ\���ܙ\�Vݘ\�KX��܋XX��[�
WH�[��][ۋX��ܜȂ�����Y��\�[۟B�؝]ۏ��
J_B��]����]���
H�
�]��\�Ә[YOH��^�^X���\Lȏ���Y\��Y�\˛X\

\��JHO�
�]���^O^�_B��\�Ә[YO^��^	�\�˜��HOOH	�\�\���	ڝ\�Y�KY[�	��	ڝ\�Y�K\�\�	�XB���]���\�Ә[YO^�X^]�V�L	WH��[�Y[�L�KL�^V�L�HXY[��\�[^Y	\�˜��HOOH	�\�\��	ؙ�Vݘ\�KX��܋XX��[�
WH^]�]H��[�YX��\�I�	ؙ�Vݘ\�KX��܋\�\��X�JWH�ܙ\��ܙ\�Vݘ\�KX��܋X�ܙ\�WH^Vݘ\�KX��܋]^\�[X\�JWH��[�YX�\�IXB���]��\�Ә[YOH��]\�X�K\�K]ܘ\��XZ�]�ܙȏ��\�˘�۝[�O�]����]����]���
J_B���Y[��	��
�]��\�Ә[YOH��^�\�Y�K\�\����]��\�Ә[YOH���Vݘ\�KX��܋\�\��X�JWH�ܙ\��ܙ\�Vݘ\�KX��܋X�ܙ\�WH��[�Y[�L�KL���[�YX�\�H����Y\���^�O^�MH�\�Ә[YOH�[�[X]K\�[�^Vݘ\�KX��܋XX��[�
WH�ς��]����]���
_B�]��Y�^�Y\��Y�\�[��Y�Hς��]���
_B��]�����ʈ[�]\�XH
��B�]��\�Ә[YOH��^\��[��L�ܙ\�]�ܙ\�Vݘ\�KX��܋X�ܙ\�WHL����]��\�Ә[YOH��^][\�Y[��\LK�H��Vݘ\�KX��܋\�\��X�JWH�ܙ\��ܙ\�Vݘ\�KX��܋X�ܙ\�WH��[�Y[�L��HKLK�H���\�]�][���ܙ\�Vݘ\�KX��܋XX��[�
WH�[��][ۋX��ܜȏ��^\�XB��Y�^�^\�XT�Y�B��[YO^�[�]B�ې�[��O^�HO��][�]
K�\��]��[YJ_B�ے�^Q�ۏ^�[�R�^Q�۟B�X�Z�\�H�\��X��]\��\\����������^�_B��\�Ә[YOH��^LH��]�[��\�[�^V�L�H^Vݘ\�KX��܋]^\�[X\�JWHX�Z�\��^Vݘ\�KX��܋]^[]]Y
WH�\�^�K[�ۙH�][�K[�ۙHXY[��\�[^YX^ZV�L�H��ς��]ۂ�ې�X��^��[�Y\��Y�_B�\�X�Y^�Z[�]��[J
H�Y[��B��\�Ә[YO^��^\��[��LLK�H��[�Y[Y�[��][ۋX��ܜ�	[�]��[J
H	��[�Y[��	�^Vݘ\�KX��܋XX��[�
WHݙ\����Vݘ\�KX��܋XX��[�
WK�L	�	�^Vݘ\�KX��܋]^[]]Y
WH�\��܋[��X[��Y	XB����[��^�O^�MHς�؝]ۏ���]����\�Ә[YOH�^V�\H^Vݘ\�KX��܋]^[]]Y
WH]LHLH����Y�
�[�\��܈�]�[�K�RH�XY�H�[�\\�XX�Y\��Y�K������]����]���
NB
