// Line icons from the design files (24×24 viewBox, stroke only).
export const ICONS = {
  hoje: "M4 6h16v14H4zM4 10h16M8 3v4M16 3v4",
  trilha: "M12 3l9 5-9 5-9-5 9-5zM3 13l9 5 9-5",
  batista: "M4 20h16M6 20V10M18 20V10M12 20v-6M3 10l9-6 9 6",
  catecismos: "M9 6h11M9 12h11M9 18h11M4.5 6h.01M4.5 12h.01M4.5 18h.01",
  simulados: "M9 3h6v3H9zM6 4.5h12V21H6zM9.5 13l2 2 3.5-4",
  biblia: "M5 4.5A1.5 1.5 0 0 1 6.5 3H19v15H6.5A1.5 1.5 0 0 0 5 19.5zM5 19.5A1.5 1.5 0 0 0 6.5 21H19",
  historia: "M12 3a9 9 0 1 0 0 18 9 9 0 0 0 0-18zM12 7v5l3 2",
  teologos: "M12 11a4 4 0 1 0 0-8 4 4 0 0 0 0 8zM4 21a8 8 0 0 1 16 0",
  comparador: "M4 4h6v16H4zM14 4h6v16h-6z",
  celula: "M4 5h16v11H9l-5 4z",
  notas: "M6 3h9l4 4v14H6zM14 3v5h5M9 13h7M9 17h5",
  chat: "M4 5h16v11H9l-5 4zM8 9h8M8 12h5",
  fila: "M3 13h5l1 3h6l1-3h5M5 5h14l2 8v6H3v-6z",
  ajustes: "M4 7h10M18 7h2M4 17h4M12 17h8M16 5v4M10 15v4",
  mais: "M5 12h.5M12 12h.5M19 12h.5",
  busca: "M16 16l4.5 4.5M11 4.5a6.5 6.5 0 1 0 0 13 6.5 6.5 0 0 0 0-13z",
  mais_sinal: "M12 5v14M5 12h14",
  check: "M5 12.5l4.5 4.5L19 7.5",
  chevron: "M6 9l6 6 6-6",
  direita: "M9 6l6 6-6 6",
  voltar: "M15 6l-6 6 6 6",
  fechar: "M6 6l12 12M18 6L6 18",
  copiar: "M8 8h11v12H8zM5 16V4h11",
  externo: "M14 4h6v6M20 4l-9 9M18 14v6H4V6h6",
  fontes: "M4 4h16v16H4zM8 8h8M8 12h8M8 16h5",
} as const;

export type IconName = keyof typeof ICONS;

export function Icon({
  name,
  size = 17,
  stroke = 1.5,
  className,
}: {
  name: IconName;
  size?: number;
  stroke?: number;
  className?: string;
}) {
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth={stroke}
      strokeLinecap="round"
      strokeLinejoin="round"
      className={className}
      aria-hidden="true"
    >
      <path d={ICONS[name]} />
    </svg>
  );
}

/** Bookmark ribbon ("fitilho"). */
export function Ribbon({ color, width = 9, height = 13 }: { color: string; width?: number; height?: number }) {
  return (
    <svg width={width} height={height} viewBox="0 0 9 13" fill={color} aria-hidden="true">
      <path d="M0 0h9v13L4.5 9.5 0 13z" />
    </svg>
  );
}

export function RibbonOutline({ size = 11 }: { size?: number }) {
  return (
    <svg width={(size * 8) / 11} height={size} viewBox="0 0 9 13" fill="none" stroke="currentColor" strokeWidth="1.3" aria-hidden="true">
      <path d="M.7.7h7.6v11L4.5 8.8.7 11.7z" />
    </svg>
  );
}

/** "Da sua base" seal: book icon. */
export function FromYourBase({ extra }: { extra?: string }) {
  return (
    <span className="origin">
      <Icon name="biblia" size={13} stroke={1.8} />
      Da sua base{extra ? ` · ${extra}` : ""}
    </span>
  );
}
