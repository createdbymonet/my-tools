import * as vscode from 'vscode';
import { buildHierarchy, type HierarchyNode } from '../hierarchy/groupHierarchy';
import type { GroupStore, LocatedGroup } from '../storage/types';
import { sameUri, uriKey } from '../utils/fileIdentity';
import { FileTreeItem, GroupTreeItem, RangeTreeItem, VirtualGroupTreeItem, type MarkerTreeItem } from './groupTreeItem';

export { FileTreeItem, GroupTreeItem, RangeTreeItem, VirtualGroupTreeItem, type MarkerTreeItem } from './groupTreeItem';

export class GroupTreeProvider implements vscode.TreeDataProvider<MarkerTreeItem>, vscode.Disposable {
  private readonly changed = new vscode.EventEmitter<MarkerTreeItem | undefined>();
  public readonly onDidChangeTreeData = this.changed.event;
  private readonly subscription: vscode.Disposable;

  public constructor(private readonly store: GroupStore) {
    this.subscription = store.onDidChange(() => this.refresh());
  }

  public refresh(): void {
    this.changed.fire(undefined);
  }

  public getTreeItem(element: MarkerTreeItem): vscode.TreeItem {
    return element;
  }

  public getChildren(element?: MarkerTreeItem): MarkerTreeItem[] {
    if (element instanceof RangeTreeItem) {
      return [];
    }
    if (element instanceof FileTreeItem) {
      const item = this.current(element.item);
      return item?.group.ranges.filter(range =>
        sameUri(vscode.Uri.joinPath(item.workspaceFolder.uri, range.filePath), element.uri)
      ).map(range => new RangeTreeItem(item, range)) ?? [];
    }
    if (element instanceof GroupTreeItem) {
      const item = this.current(element.item);
      if (!item) {
        return [];
      }
      const children = element.node?.children.map(node => this.hierarchyItem(node, item.workspaceFolder)) ?? [];
      const files = new Map<string, string>();
      for (const range of item.group.ranges) {
        const key = uriKey(vscode.Uri.joinPath(item.workspaceFolder.uri, range.filePath));
        if (!files.has(key)) {
          files.set(key, range.filePath);
        }
      }
      return [...children, ...[...files.values()].sort((a, b) => a.localeCompare(b)).map(file => new FileTreeItem(item, file))];
    }
    if (element instanceof VirtualGroupTreeItem) {
      return element.node.children.map(node => this.hierarchyItem(node, element.workspaceFolder));
    }
    const folders = new Map<string, { folder: vscode.WorkspaceFolder; items: LocatedGroup[] }>();
    for (const item of this.store.getAll()) {
      const key = uriKey(item.workspaceFolder.uri);
      let folder = folders.get(key);
      if (!folder) {
        folder = { folder: item.workspaceFolder, items: [] };
        folders.set(key, folder);
      }
      folder.items.push(item);
    }
    const multiRoot = (vscode.workspace.workspaceFolders?.length ?? 0) > 1;
    return [...folders.values()].sort((a, b) => a.folder.index - b.folder.index).flatMap(({ folder, items }) =>
      buildHierarchy(items.map(item => item.group)).map(node => this.hierarchyItem(node, folder, multiRoot))
    );
  }

  private hierarchyItem(node: HierarchyNode, folder: vscode.WorkspaceFolder, showFolderName = false): MarkerTreeItem {
    return node.groups.length === 1
      ? new GroupTreeItem({ group: node.groups[0], workspaceFolder: folder }, node, showFolderName)
      : new VirtualGroupTreeItem(node, folder, showFolderName);
  }

  private current(reference: LocatedGroup): LocatedGroup | undefined {
    return this.store.getAll().find(item => item.group.id === reference.group.id &&
      sameUri(item.workspaceFolder.uri, reference.workspaceFolder.uri));
  }

  public dispose(): void {
    this.subscription.dispose();
    this.changed.dispose();
  }
}
