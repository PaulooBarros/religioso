import { redirect } from "next/navigation";
import { bookById } from "@/lib/bible/books";
import { chapterHref } from "@/lib/bible/reference";
import { getLastRead } from "@/lib/queries";
import { currentProfileId } from "@/lib/session";

/** "Ler" opens where the profile stopped, or Genesis 1. */
export default async function BiblePage() {
  const profileId = await currentProfileId();
  const last = profileId ? await getLastRead(profileId) : null;
  const book = last ? bookById(last.book_id) : undefined;
  if (last && book) redirect(chapterHref(book, last.chapter, last.verse ?? undefined));
  redirect("/biblia/genesis/1");
}
