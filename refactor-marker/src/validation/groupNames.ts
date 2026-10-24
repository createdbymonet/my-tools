/** Keep stored spelling intact, including legacy names that fail new-input validation. */
export function parseGroupPath(name: string): string[] {
  return name.split('/');
}

/** Validate stored spelling too, where input-dialog trimming must not hide unsafe characters. */
export function validateGroupNameCharacters(name: string): string | undefined {
  return /^[\p{L}\p{N} _/-]+$/u.test(name) ? undefined
    : 'Group names can contain only letters, numbers, spaces, hyphens (-), underscores (_), and slashes (/).';
}

/** Validate the trimmed full input without rewriting individual hierarchy segments. */
export function validateGroupName(input: string): string | undefined {
  const name = input.trim();
  if (name.length === 0) {
    return 'Enter a group name.';
  }
  const characterProblem = validateGroupNameCharacters(name);
  if (characterProblem !== undefined) {
    return characterProblem;
  }
  if (parseGroupPath(name).some(segment => segment.trim().length === 0)) {
    return 'Group paths cannot start or end with "/" or contain empty or whitespace-only path segments.';
  }
  return undefined;
}
