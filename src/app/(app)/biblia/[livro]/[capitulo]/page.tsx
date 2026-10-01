import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { Reader } from "@/components/reader";
import { BOOKS, bookById, bookBySlug } from "@/lib/bible/books";
import { chapterHref } from "@/lib/bible/reference";
import { BIBLIA_LIVRE_SOURCE } from "@/lib/bible/source";
import { chapterCounts, getChapter } from "@/lib/bible/text";
import { getBookmarks, getChapterNotes } from "@/lib/queries";
import { currentProfileId } from "@/lib/session";

type Params = { livro: string; capitulo: string };

export async function generateMetadata({ params }: { params: Promise<Params> }): Promise<Metadata> {
  const { livro, capitulo } = await params;
  const book = bookBySlug(livro);
  return { title: book ? `${book.name} ${capitulo}` : "Bíblia" };
}

export default async function ChapterPage({ params }: PageProps<"/biblia/[livro]/[capitulo]">) {
  const { livro, capitulo } = await params;
  const book = bookBySlug(livro);
  const chapter = Number(capitulo);
  if (!book || !Number.isInteger(chapter) || chapter < 1) notFound();

  const [verses, counts, profileId] = await Promise.all([getChapter(book, chapter), chapterCounts(), currentProfileId()]);
  if (!verses) notFound();

  const [allBookmarks, notes] = profileId
    ? await Promise.all([getBookmarks(profileId), getChapterNotes(profileId, book.id, chapter)])
    : [[], []];

  const total = counts[book.id];
  const prevBook = bookById(book.id - 1);
  const nextBook = bookById(book.id + 1);
  const prev =
    chapter > 1
      ? { href: chapterHref(book, chapter - 1), label: `${book.name} ${chapter - 1}` }
      : prevBook
        ? { href: chapterHref(prevBook, counts[prevBook.id]), label: `${prevBook.name} ${counts[prevBook.id]}` }
        : null;
  const next =
    chapter < total
      ? { href: chapterHref(book, chapter + 1), label: `${book.name} ${chapter + 1}` }
      : nextBook
        ? { href: chapterHref(nextBook, 1), label: `${nextBook.name} 1` }
        : null;

  const knownTags = [...new Set(allBookmarks.map((b) => b.tag).filter((t): t is string => Boolean(t)))].sort();

  return (
    <Reader
      key={`${book.id}-${chapter}`}
      book={book}
      chapter={chapter}
      chapterTotal={total}
      verses={verses}
      initialBookmarks={allBookmarks.filter((b) => b.book_id === book.id && b.chapter === chapter)}
      initialNotes={notes}
      knownTags={knownTags}
      canWrite={Boolean(profileId)}
      books={BOOKS.map((b) => ({ id: b.id, name: b.name, slug: b.slug, chapters: counts[b.id] }))}
      prev={prev}
      next={next}
      credit={BIBLIA_LIVRE_SOURCE.required_credit}
    />
  );
}
