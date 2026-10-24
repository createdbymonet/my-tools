import * as vscode from 'vscode';
import { COLOR_DEFINITIONS } from '../decorations/colors';
import type { HierarchyNode } from '../hierarchy/groupHierarchy';
import type { RefactorRange } from '../models/refactorGroup';
import type { LocatedGroup } from '../storage/types';
import { uriKey } from '../utils/fileIdentity';
import { inclusiveEndLine } from '../utils/ranges';
import { parseGroupPath } from '../validation/groupNames';

/** A path-only parent has no persisted group and cannot be renamed or deleted. */
export class VirtualGroupTreeItem extends vscode.TreeItem {
  public readonly path: string;

  public constructor(
    public readonly node: HierarchyNode,
    public readonly workspaceFolder: vscode.WorkspaceFolder,
    showFolderName: boolean
  ) {
    super(node.segment || '(empty segment)', vscode.TreeItemCollapsibleState.Expanded);
    this.path = node.path;
    this.id = `hierarchy:${uriKey(workspaceFolder.uri)}:${node.path}`;
    this.contextValue = 'refactorVirtualGroup';
    this.iconPath = new vscode.ThemeIcon('symbol-namespace');
    this.description = showFolderName ? workspaceFolder.name : undefined;
    this.tooltip = node.path;
  }
}

/** Only this node represents an actual persisted group. */
export class GroupTreeItem extends vscode.TreeItem {
  public readonly path: string;
  public readonly workspaceFolder: vscode.WorkspaceFolder;

  public constructor(
    public readonly item: LocatedGroup,
    public readonly node?: HierarchyNode,
    showFolderName = false
  ) {
    const { group, workspaceFolder } = item;
    const segment = parseGroupPath(group.name).at(-1) || '(empty segment)';
    super(segment, group.ranges.length || node?.children.length
      ? vscode.TreeItemCollapsibleState.Expanded : vscode.TreeItemCollapsibleState.None);
    this.path = group.name;
    this.workspaceFolder = workspaceFolder;
    const color = COLOR_DEFINITIONS[group.color];
    this.id = `group:${uriKey(workspaceFolder.uri)}:${group.id}`;
    this.contextValue = 'refactorGroup';
    this.description = [
      showFolderName ? workspaceFolder.name : undefined,
      `${group.ranges.length} range${group.ranges.length === 1 ? '' : 's'}`
    ].filter(Boolean).join(' · ');
    this.tooltip = new vscode.MarkdownString().appendText(`${group.name}\n${this.description}\n${color.label}`);
    this.iconPath = new vscode.ThemeIcon('circle-filled', new vscode.ThemeColor(color.themeColor));
    if (group.ranges.length) {
      this.command = {
        command: 'refactorMarker.revealGroup',
        title: 'Refactor Marker: Reveal Group',
        arguments: [item]
      };
    }
  }
}

export class FileTreeItem extends vscode.TreeItem {
  public readonly uri: vscode.Uri;
  public readonly path: string;
  public readonly workspaceFolder: vscode.WorkspaceFolder;

  public constructor(public readonly item: LocatedGroup, public readonly filePath: string) {
    super(filePath, vscode.TreeItemCollapsibleState.Expanded);
    this.workspaceFolder = item.workspaceFolder;
    this.path = item.group.name;
    this.uri = vscode.Uri.joinPath(item.workspaceFolder.uri, filePath);
    this.id = `file:${uriKey(item.workspaceFolder.uri)}:${item.group.id}:${uriKey(this.uri)}`;
    this.contextValue = 'refactorFile';
    this.resourceUri = this.uri;
    this.iconPath = vscode.ThemeIcon.File;
    this.tooltip = this.uri.fsPath;
  }
}

export class RangeTreeItem extends vscode.TreeItem {
  public readonly rangeId: string;

  public constructor(public readonly item: LocatedGroup, range: RefactorRange) {
    super(`Lines ${range.startLine + 1}–${inclusiveEndLine(range) + 1}`, vscode.TreeItemCollapsibleState.None);
    this.rangeId = range.id;
    this.id = `range:${uriKey(item.workspaceFolder.uri)}:${item.group.id}:${range.id}`;
    this.contextValue = 'refactorRange';
    this.resourceUri = vscode.Uri.joinPath(item.workspaceFolder.uri, range.filePath);
    this.iconPath = new vscode.ThemeIcon('selection');
    this.tooltip = `${item.group.name}\n${range.filePath}\n${this.label}`;
    this.command = {
      command: 'refactorMarker.revealGroup',
      title: 'Refactor Marker: Reveal Range',
      arguments: [this]
    };
  }
}

export type MarkerTreeItem = VirtualGroupTreeItem | GroupTreeItem | FileTreeItem | RangeTreeItem;
