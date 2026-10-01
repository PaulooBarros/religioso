export type Bookmark = {
  id: string;
  book_id: number;
  chapter: number;
  verse: number | null;
  name: string | null;
  tag: string | null;
  is_last_read: boolean;
  updated_at: string;
};

export type NotePassage = {
  book_id: number;
  chapter: number;
  verse_start: number | null;
  verse_end: number | null;
};

export type Note = {
  id: string;
  body: string;
  tags: string[];
  created_at: string;
  updated_at: string;
  note_passages: NotePassage[];
  theme_id?: string | null;
  subtheme_id?: string | null;
};

export type ActionResult<T = undefined> = { ok: true; data: T } | { ok: false; error: string };
