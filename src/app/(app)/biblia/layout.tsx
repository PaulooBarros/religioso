import { BibleTabs } from "./tabs";

export default function BibleLayout({ children }: LayoutProps<"/biblia">) {
  return (
    <>
      <BibleTabs />
      {children}
    </>
  );
}
