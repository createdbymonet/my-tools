import type { RefactorGroup } from '../models/refactorGroup';
import { parseGroupPath } from '../validation/groupNames';

export interface HierarchyNode {
  segment: string;
  path: string;
  /** Empty for a virtual parent; persisted names are made unique when storage loads. */
  groups: RefactorGroup[];
  children: HierarchyNode[];
}

/** Derive a tree without mutating groups or changing canonical range order. */
export function buildHierarchy(groups: readonly RefactorGroup[]): HierarchyNode[] {
  const roots: HierarchyNode[] = [];
  for (const group of groups) {
    let siblings = roots;
    let node: HierarchyNode | undefined;
    const segments = parseGroupPath(group.name);
    for (let index = 0; index < segments.length; index++) {
      const segment = segments[index];
      node = siblings.find(candidate => candidate.segment === segment);
      if (node === undefined) {
        node = { segment, path: segments.slice(0, index + 1).join('/'), groups: [], children: [] };
        siblings.push(node);
      }
      siblings = node.children;
    }
    node?.groups.push(group);
  }
  return roots;
}

/** Exporting a child always selects its complete top-level hierarchy. */
export function findTopLevelHierarchy(groups: readonly RefactorGroup[], name: string): HierarchyNode | undefined {
  const topLevel = parseGroupPath(name)[0];
  return buildHierarchy(groups).find(node => node.segment === topLevel);
}
