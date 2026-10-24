export interface DraftDestination {
  exists(): Promise<boolean>;
  confirmOverwrite(): Promise<boolean>;
  write(overwrite: boolean): Promise<void>;
}

/** Only an explicit confirmation authorizes replacement of an existing draft. */
export async function writeDraft(destination: DraftDestination): Promise<boolean> {
  const exists = await destination.exists();
  if (exists && !await destination.confirmOverwrite()) { return false; }
  await destination.write(exists);
  return true;
}
