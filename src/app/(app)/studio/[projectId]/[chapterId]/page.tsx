'use client';

import { useEffect, useState, use } from 'react';
import { EditorToolbar } from '@/components/studio/EditorToolbar';
import { Editor, type StudioEditorHandle } from '@/components/studio/Editor';
import { StatusBar } from '@/components/studio/StatusBar';
import { useStudioContext } from '@/lib/studio-context';

const SAMPLE_CHAPTERS: Record<
  string,
  Record<string, { projectTitle: string; eyebrow: string; title: string; html: string; wordCount: number }>
> = {
  'the-hollow-garden': {
    threshold: {
      projectTitle: 'The Hollow Garden',
      eyebrow: 'Chapter Two',
      title: 'Threshold',
      wordCount: 23412,
      html: `
        <p>The garden had a way of forgetting visitors. Maren had known it since she was small — how the gravel paths rearranged themselves between hedges, how the old stone bench would be there one morning and gone the next, as if the house had only just remembered what a bench was for.</p>
        <p>She came back the autumn her mother died. The lock on the iron gate gave too easily. She told herself this was because the gate had always been temperamental, that nothing about it was meant for her. Still, she stood at the threshold a long time before stepping through.</p>
        <p><mark>Inside, the air smelled of cold pollen and rust</mark>. The yew tunnel was thinner than she remembered. Or she was wider — older — taller. She could not tell. It had been twelve years.</p>
        <p>She walked the inner ring twice before she allowed herself to look at the pond. Her mother had drowned what she loved here, in the small ways and the large. A line of bird-skulls along the rim. A box of letters tied with ribbon, sunk in the silt. The cat that vanished one summer.</p>
        <p>Maren knelt at the water's edge. Her face came up to meet her — pale, narrow, distrustful. "I'm here," she said, to no one. The garden did not answer. It rarely did.</p>
      `,
    },
    'unmarked-paths': {
      projectTitle: 'The Hollow Garden',
      eyebrow: 'Chapter One',
      title: 'Unmarked Paths',
      wordCount: 23412,
      html: '<p>It started, as these things do, in early September.</p><p>This is a placeholder for chapter one — open Chapter Two for the styled sample.</p>',
    },
    'salt-and-iron': {
      projectTitle: 'The Hollow Garden',
      eyebrow: 'Chapter Three',
      title: 'Salt and Iron',
      wordCount: 23412,
      html: '<p>This is a placeholder for chapter three.</p>',
    },
    'cold-bloom': {
      projectTitle: 'The Hollow Garden',
      eyebrow: 'Chapter Four',
      title: 'Cold Bloom',
      wordCount: 23412,
      html: '<p>This is a placeholder for chapter four.</p>',
    },
  },
};

type PageProps = {
  params: Promise<{ projectId: string; chapterId: string }>;
};

export default function ChapterPage({ params }: PageProps) {
  const { projectId, chapterId } = use(params);
  const data = SAMPLE_CHAPTERS[projectId]?.[chapterId];
  const { setChapterContext } = useStudioContext();
  const [handle, setHandle] = useState<StudioEditorHandle | null>(null);

  useEffect(() => {
    if (!data) return;
    const plain = data.html.replace(/<[^>]+>/g, ' ').replace(/\s+/g, ' ').trim();
    setChapterContext({ text: plain, chapterTitle: data.title, projectTitle: data.projectTitle });
  }, [data, setChapterContext]);

  if (!data) {
    return (
      <div className="flex flex-col items-center justify-center h-full text-muted text-sm">
        <p>This chapter doesn&apos;t exist yet.</p>
        <p className="mt-2 text-xs opacity-70">{projectId} / {chapterId}</p>
      </div>
    );
  }

  return (
    <>
      <EditorToolbar
        projectTitle={data.projectTitle}
        chapterTitle={`Chapter ${data.eyebrow.split(' ')[1] ?? ''} — ${data.title}`}
        onBold={() => handle?.toggleBold()}
        onItalic={() => handle?.toggleItalic()}
        onUndo={() => handle?.undo()}
      />
      <Editor
        eyebrow={data.eyebrow}
        chapterTitle={data.title}
        initialContent={data.html}
        registerHandle={setHandle}
        onTextChange={(plain) =>
          setChapterContext({ text: plain, chapterTitle: data.title, projectTitle: data.projectTitle })
        }
      />
      <StatusBar projectTitle={data.projectTitle} wordCount={data.wordCount} />
    </>
  );
}
