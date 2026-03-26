// Real brand logos downloaded from public sources into /public/brands/
const LOCAL_LOGO: Record<string, string> = {
  PTT:      '/brands/ptt.png',
  SHELL:    '/brands/shell.png',
  BANGCHAK: '/brands/bangchak.png',
  CALTEX:   '/brands/caltex.png',
  IRPC:     '/brands/irpc.png',
  PT:       '/brands/pt.png',
  SUSCO:    '/brands/susco.png',
  PURE:     '/brands/pure.png',
  // Esso not separately available — use fallback
  ESSO:     '/brands/fallback.svg',
};

export function getBrandLogoUrl(brand: string): string {
  const key = brand.trim().toUpperCase();
  return LOCAL_LOGO[key] ?? '/brands/fallback.svg';
}
