export interface ExportSelectionOptions {
  all?: boolean;
  only?: ReadonlySet<string> | null;
}

/**
 * Select release candidates from a validated library.
 *
 * The manifest is the normal release contract; `--all` is deliberately
 * opt-in for library maintenance, and `--only` supports a smaller release.
 */
export function selectExportFiles(
  availableFiles: readonly string[],
  manifestIds: readonly string[],
  options: ExportSelectionOptions = {},
): string[] {
  const available = new Set(availableFiles);

  if (options.only) {
    return [...options.only]
      .map((id) => `${id}.json`)
      .filter((file) => available.has(file));
  }

  if (options.all) return [...availableFiles];

  const manifestFiles = manifestIds.map((id) => `${id}.json`);
  const missing = manifestFiles.filter((file) => !available.has(file));
  if (missing.length > 0) {
    throw new Error(`Manifest references missing production assets: ${missing.join(', ')}`);
  }

  return manifestFiles;
}
