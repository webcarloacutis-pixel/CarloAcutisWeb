const regions: Record<string, string> = { europe:'150', asia:'142', africa:'002', 'north-america':'003', 'south-america':'005', oceania:'009', antarctica:'AQ', america:'019' }
/** Geographic UI names from the runtime's established locale data; no catalog fields are rewritten. */
export function geographicName(code: string, language: string): string {
  try { return new Intl.DisplayNames([language], { type:'region' }).of(regions[code] || code) || code }
  catch { return code }
}
