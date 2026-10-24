import type { GroupStore } from '../storage/types';
import { currentGroup, pickGroup } from './ui';

export async function deleteGroup(store: GroupStore, argument?: unknown): Promise<void> {
  const item = await pickGroup(store, argument);
  const current = item ? currentGroup(store, item) : undefined;
  if (current) {
    await store.delete(current);
  }
}
