import { Mark, mergeAttributes } from '@tiptap/core';
import { Editor } from '@tiptap/react';

// ============================================================================
// Track Changes — Phase 1
// ============================================================================
//
// Two inline marks live inside the document so they persist through save/load:
//   trackInsertion — proposed new text (rendered <ins data-track>)
//   trackDeletion  — text slated for removal (rendered <del data-track>)
//
// Both carry a `changeId` attribute so insert/delete pairs can be accepted or
// rejected together. Accept = keep the insertion text, drop the deletion.
// Reject = drop the insertion text, keep the deletion text.
//
// Rendering is driven by the two CSS classes applied in renderHTML.
// ============================================================================

export interface PendingChange {
  changeId: string;
  insertFrom: number;
  insertTo: number;
  deleteFrom: number;
  deleteTo: number;
  insertedText: string;
  deletedText: string;
  source: string; // e.g. "improve", "tighten", "show-dont-tell"
}

export const TrackInsertion = Mark.create({
  name: 'trackInsertion',

  inclusive: false,

  addAttributes() {
    return {
      changeId: {
        default: '',
        parseHTML: (el) => el.getAttribute('data-change-id') || '',
        renderHTML: (attrs) => (attrs.changeId ? { 'data-change-id': attrs.changeId } : {}),
      },
      source: {
        default: '',
        parseHTML: (el) => el.getAttribute('data-source') || '',
        renderHTML: (attrs) => (attrs.source ? { 'data-source': attrs.source } : {}),
      },
    };
  },

  parseHTML() {
    return [{ tag: 'ins[data-track="insert"]' }];
  },

  renderHTML({ HTMLAttributes }) {
    return [
      'ins',
      mergeAttributes(HTMLAttributes, { 'data-track': 'insert', class: 'track-insert' }),
      0,
    ];
  },
});

export const TrackDeletion = Mark.create({
  name: 'trackDeletion',

  inclusive: false,

  addAttributes() {
    return {
      changeId: {
        default: '',
        parseHTML: (el) => el.getAttribute('data-change-id') || '',
        renderHTML: (attrs) => (attrs.changeId ? { 'data-change-id': attrs.changeId } : {}),
      },
      source: {
        default: '',
        parseHTML: (el) => el.getAttribute('data-source') || '',
        renderHTML: (attrs) => (attrs.source ? { 'data-source': attrs.source } : {}),
      },
    };
  },

  parseHTML() {
    return [{ tag: 'del[data-track="delete"]' }];
  },

  renderHTML({ HTMLAttributes }) {
    return [
      'del',
      mergeAttributes(HTMLAttributes, { 'data-track': 'delete', class: 'track-delete' }),
      0,
    ];
  },
});

// ============================================================================
// Helpers
// ============================================================================

function newChangeId(): string {
  if (typeof crypto !== 'undefined' && 'randomUUID' in crypto) {
    return crypto.randomUUID();
  }
  return `ch-${Date.now()}-${Math.random().toString(36).slice(2, 10)}`;
}

/**
 * Replace a range with a pending change. The original text remains in the doc
 * marked as a deletion, followed by the new text marked as an insertion.
 * Returns the changeId so the caller can track it.
 */
export function proposeReplacement(
  editor: Editor,
  from: number,
  to: number,
  newText: string,
  source: string = ''
): string {
  if (!editor || from === to) return '';

  const changeId = newChangeId();
  const schema = editor.state.schema;
  const insMarkType = schema.marks.trackInsertion;
  const delMarkType = schema.marks.trackDeletion;
  if (!insMarkType || !delMarkType) {
    // Extensions not wired — fail safe to a plain replace so the user still gets their edit
    editor.chain().focus().deleteRange({ from, to }).insertContent(newText).run();
    return '';
  }

  // Insert as INLINE text so the replacement stays inside the original
  // paragraph. Inserting block-level paragraph nodes here splits the host
  // paragraph, which leaves a visible gap after accept.
  //
  // Multi-paragraph suggestions are flattened to one paragraph (separated by
  // spaces) — AI Toolbar edits are almost always within-paragraph rewrites.
  const flatText = newText.replace(/\r\n/g, '\n').replace(/\n+/g, ' ').replace(/\s+/g, ' ').trim();
  if (!flatText) return '';

  const insertInline = {
    type: 'text',
    text: flatText,
    marks: [{ type: 'trackInsertion', attrs: { changeId, source } }],
  };

  // 1. Mark the original range as a deletion
  // 2. Insert the new inline run right after it (same paragraph)
  editor
    .chain()
    .focus()
    .setTextSelection({ from, to })
    .setMark('trackDeletion', { changeId, source })
    .setTextSelection(to)
    .insertContent(insertInline)
    .run();

  return changeId;
}

/**
 * Walk the document and return every pending change, grouped by changeId.
 */
export function collectPendingChanges(editor: Editor): PendingChange[] {
  const map = new Map<string, PendingChange>();
  if (!editor) return [];

  editor.state.doc.descendants((node, pos) => {
    if (!node.isText || !node.text) return;
    node.marks.forEach((mark) => {
      if (mark.type.name !== 'trackInsertion' && mark.type.name !== 'trackDeletion') return;
      const id: string = mark.attrs.changeId || '';
      if (!id) return;
      const src: string = mark.attrs.source || '';
      const existing = map.get(id) ?? {
        changeId: id,
        insertFrom: -1,
        insertTo: -1,
        deleteFrom: -1,
        deleteTo: -1,
        insertedText: '',
        deletedText: '',
        source: src,
      };
      const rangeFrom = pos;
      const rangeTo = pos + (node.text?.length ?? 0);
      if (mark.type.name === 'trackInsertion') {
        if (existing.insertFrom === -1) existing.insertFrom = rangeFrom;
        existing.insertTo = rangeTo;
        existing.insertedText += node.text;
      } else {
        if (existing.deleteFrom === -1) existing.deleteFrom = rangeFrom;
        existing.deleteTo = rangeTo;
        existing.deletedText += node.text;
      }
      if (!existing.source && src) existing.source = src;
      map.set(id, existing);
    });
  });

  // Sort by earliest position so the UI can walk them top-to-bottom.
  return [...map.values()].sort((a, b) => {
    const aPos = a.deleteFrom !== -1 ? a.deleteFrom : a.insertFrom;
    const bPos = b.deleteFrom !== -1 ? b.deleteFrom : b.insertFrom;
    return aPos - bPos;
  });
}

interface Range {
  from: number;
  to: number;
  kind: 'insert' | 'delete';
}

/**
 * Find every run of text carrying one of our marks for a given changeId.
 * Ranges are returned in document order so we can sort+apply them descending.
 */
function findChangeRanges(editor: Editor, changeId: string): Range[] {
  const out: Range[] = [];
  editor.state.doc.descendants((node, pos) => {
    if (!node.isText || !node.text) return;
    node.marks.forEach((mark) => {
      if (mark.attrs.changeId !== changeId) return;
      if (mark.type.name === 'trackInsertion') {
        out.push({ from: pos, to: pos + (node.text?.length ?? 0), kind: 'insert' });
      } else if (mark.type.name === 'trackDeletion') {
        out.push({ from: pos, to: pos + (node.text?.length ?? 0), kind: 'delete' });
      }
    });
  });
  return out;
}

/**
 * Accept a pending change:
 *   - delete the trackDeletion-marked ranges
 *   - strip the trackInsertion mark (leaving the text)
 */
export function acceptChange(editor: Editor, changeId: string): boolean {
  if (!editor || !changeId) return false;
  const ranges = findChangeRanges(editor, changeId);
  if (ranges.length === 0) return false;

  const schema = editor.state.schema;
  const insMark = schema.marks.trackInsertion;
  const delMark = schema.marks.trackDeletion;
  if (!insMark || !delMark) return false;

  // Apply in descending position so earlier ranges don't shift under us.
  ranges.sort((a, b) => b.from - a.from);
  const tr = editor.state.tr;
  for (const r of ranges) {
    if (r.kind === 'delete') {
      tr.delete(r.from, r.to);
    } else {
      tr.removeMark(r.from, r.to, insMark);
    }
  }
  editor.view.dispatch(tr);
  return true;
}

/**
 * Reject a pending change:
 *   - delete the trackInsertion-marked ranges
 *   - strip the trackDeletion mark (leaving the original text)
 */
export function rejectChange(editor: Editor, changeId: string): boolean {
  if (!editor || !changeId) return false;
  const ranges = findChangeRanges(editor, changeId);
  if (ranges.length === 0) return false;

  const schema = editor.state.schema;
  const insMark = schema.marks.trackInsertion;
  const delMark = schema.marks.trackDeletion;
  if (!insMark || !delMark) return false;

  ranges.sort((a, b) => b.from - a.from);
  const tr = editor.state.tr;
  for (const r of ranges) {
    if (r.kind === 'insert') {
      tr.delete(r.from, r.to);
    } else {
      tr.removeMark(r.from, r.to, delMark);
    }
  }
  editor.view.dispatch(tr);
  return true;
}

/**
 * Accept every pending change in the current doc.
 */
export function acceptAllChanges(editor: Editor): number {
  const changes = collectPendingChanges(editor);
  let count = 0;
  for (const c of changes) if (acceptChange(editor, c.changeId)) count++;
  return count;
}

/**
 * Reject every pending change in the current doc.
 */
export function rejectAllChanges(editor: Editor): number {
  const changes = collectPendingChanges(editor);
  let count = 0;
  for (const c of changes) if (rejectChange(editor, c.changeId)) count++;
  return count;
}

// ============================================================================
// Settings — persisted toggle for track-changes mode
// ============================================================================

const TRACK_CHANGES_KEY = 'prosecraft-track-changes-enabled';

export function loadTrackChangesEnabled(): boolean {
  if (typeof window === 'undefined') return false;
  try {
    return localStorage.getItem(TRACK_CHANGES_KEY) === '1';
  } catch {
    return false;
  }
}

export function saveTrackChangesEnabled(enabled: boolean) {
  if (typeof window === 'undefined') return;
  try {
    localStorage.setItem(TRACK_CHANGES_KEY, enabled ? '1' : '0');
  } catch {
    // ignore
  }
}
