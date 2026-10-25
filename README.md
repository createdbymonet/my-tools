# My Tools

Small tools for code refactoring and application document generation. Each tool has its own dependencies, setup, and README.

## Tools

### [Refactor Marker](./refactor-marker/README.md)

A local VS Code extension for organizing code ranges across files into named, colored hierarchies.

- Highlight related ranges across multiple files and navigate to them from a sidebar.
- Save marker metadata locally in the workspace for use across sessions.
- Export a hierarchy as a nested TypeScript function draft with source-file comments.

Exported functions are drafts that require manual review and may not compile. Install locally as a VSIX; see the tool's README for instructions and limitations.

**Stack:** TypeScript, VS Code Extension API, ESLint.

### [Resume Builder](./resume-builder/README.md)

Create a resume and cover letter from JSON, with shared profile data and application-specific overrides.

- Preview both documents locally with live updates.
- Keep personal profiles and custom applications in Git-ignored local files.
- Build standalone HTML with embedded styles, then print to PDF from a browser.

**Stack:** Vue 3, TypeScript, Vite, SCSS, Prettier.

## Getting started

Run commands from the tool's directory, using its package manager:

| Tool            | Requirements                                                        | Install        | Development                               |
| --------------- | ------------------------------------------------------------------- | -------------- | ----------------------------------------- |
| Refactor Marker | VS Code 1.95+, Node.js 22.13+ in the 22.x series or Node.js 24, npm | `npm ci`       | `npm run watch`, then press F5 in VS Code |
| Resume Builder  | Node.js 22.18+ in the 22.x series or 24+, pnpm, a modern browser    | `pnpm install` | `pnpm dev`                                |

For Refactor Marker, open `refactor-marker/` as the VS Code project folder. Run `npm run check` to compile and lint, or `npm run package` to create a local VSIX.

For Resume Builder, open `/resume.html` or `/cover-letter.html` at the address printed by Vite. Run `pnpm build` to check types, run tests, and generate `dist/resume.html` and `dist/cover-letter.html`. See its README for profile setup, application selection, and PDF settings.

## Repository structure

```text
my-tools/
├── refactor-marker/
├── resume-builder/
├── LICENSE
└── README.md
```

## License

The repository includes an [MIT License](./LICENSE). Refactor Marker's [package metadata](./refactor-marker/package.json) currently declares `UNLICENSED`; these license declarations need to be aligned.
