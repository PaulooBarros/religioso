import { BookmarkList } from "./list";
import { bookById } from "@/lib/bible/books";
import { chapterHref, formatRef } from "@/lib/bible/reference";
import { getVerseText } from "@/lib/bible/text";
import { relativeDay } from "@/lib/dates";
import { getBookmarks } from "@/lib/queries";
import { currentProfileId } from "@/lib/session";

export const metadata = { title: "Marcadores" };

export default async function BookmarksPage() {
  const profileId = await currentProfileId();
  const bookmarks = profileId ? await getBookmarks(profileId) : [];

  const items = await Promise.all(
    bookmarks.map(async (b) => {
      const book = bookById(b.book_id)!;
      const text = await getVerseText(b.book_id, b.chapter, b.verse ?? 1);
      return {
        id: b.id,
        ref: formatRef(b.book_id, b.chapter, b.verse),
        href: chapterHref(book, b.chapter, b.verse ?? undefined),
        name: b.is_last_read ? "Onde parei" : b.name,
        tag: b.is_last_read ? "automático" : b.tag,
        preview: text ? (text.length > 70 ? `${text.slice(0, 70).trimEnd()}…` : text) : "",
        when: relativeDay(b.updated_at),
        lastRead: b.is_last_read,
      };
    }),
  );

  return (
    <main className="page" style={{ paddingTop: 32 }}>
      <BookmarkList items={items} canWrite={Boolean(profileId)} />
    </main>
  );
}
