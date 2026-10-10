# Public catalogue translations

The manifest points to immutable, versioned JSON resources under `public/catalog-translations`. Only the current visible entities and selected locale are fetched, with at most four concurrent static reads and a bounded public cache. These reads never generate AI translations or include credentials.

Each field retains its complete Spanish source, a source revision hash, translated text and review category. Exact source matching invalidates only an edited field. Card excerpts also verify the backend's hash of the complete biography, including edits after character600. The MD5 field hash is a public compatibility checksum, not a security primitive. The complete resource version uses SHA256.

Current resources: the first12 editorial saints' complete biographies, seven published miracle accounts and one historical prayer, in English and Chinese. Other fields are included where translated. These are assistant translations, **not human-reviewed**; the prayer translation is **not an official liturgical translation**. This is partial coverage, not completion of179 saints in14 target languages. Original Spanish, IDs, slugs, URLs and database records are preserved.

Validate packaged resources with `node scripts/check-catalog-translations.mjs`. For current per-entity/per-field coverage, supply a local public-only source export using `--source <file> --report <private-report>`. Add `--require-complete` for acceptance of every source field in all14 target languages; that check currently fails with documented missing resources. Do not commit the full export or private reports.

After changing a translation resource, recompute the manifest SHA256 from the sorted array of all parsed packs (`kind/id/locale` order), move the resources under that new version directory and update the manifest. The consistency check rejects a mismatched version. Do not use runtime providers or mark automated work as human-reviewed.
