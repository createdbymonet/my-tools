import type { GroupStore } from '../storage/types';
import { appendSelectionToGroup, captureSelection } from './selection';
import { pickGroup } from './ui';

export async function addToExistingGroup(store: GroupStore, argument?: unknown): Promise<void> {
  await store.whenIdle();
  const selected = captureSelection(store);
  if (!selected) { return; }
  const item = await pickGroup(store, argument, selected.folder);
  if (!item) { return; }
  await appendSelectionToGroup(store, selected, item);
}
