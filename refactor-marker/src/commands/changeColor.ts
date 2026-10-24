import type { GroupStore } from '../storage/types';
import { currentGroup, pickColor, pickGroup } from './ui';

export async function changeColor(store: GroupStore, argument?: unknown): Promise<void> {
  const item = await pickGroup(store, argument);
  if (!item) {
    return;
  }
  const color = await pickColor();
  if (!color) {
    return;
  }
  const current = currentGroup(store, item);
  if (current) {
    await store.update(current, { color });
  }
}
