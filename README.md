# My Tools

Small developer tools and utilities built to improve development workflows.

## Overview

This repository collects personal tools created to solve practical problems encountered during software development. Each tool lives in its own directory with its own documentation and development setup.

## Tools

### [Refactor Marker](./refactor-marker/)

A local VS Code extension for organizing related code ranges across files during refactoring. It helps keep track of scattered logic by grouping selected code into named, colored hierarchies.

- Highlight related ranges across multiple files and navigate to them from a sidebar.
- Save marker metadata locally in the workspace for use across sessions.
- Export a hierarchy as a nested TypeScript function draft with source-file comments.

Exported files are refactoring drafts that require manual review and are not guaranteed to compile.

**Status:** Version 0.2.0, intended for internal use and local VSIX installation. Requires VS Code 1.95 or later.

See the [Refactor Marker README](./refactor-marker/README.md) for usage, limitations, installation, and development instructions (in Japanese).

## Tech stack

- **TypeScript** for the extension implementation.
- **VS Code Extension API** for commands, editor highlights, and sidebar navigation.
- **Node.js and npm** for filesystem utilities, dependency management, and build tooling.
- **ESLint** for source linting.

## Repository structure

```text
my-tools/
├── refactor-marker/
│   ├── src/
│   ├── resources/
│   ├── package.json
│   └── README.md
├── LICENSE
└── README.md
```

## Getting started

Browse a tool's directory and follow its README for setup and usage.

For Refactor Marker, open `refactor-marker/` as the project folder in VS Code and run its development commands from that directory. Its [README](./refactor-marker/README.md) covers Node.js requirements, building, launching the Extension Development Host, and packaging a local VSIX.

## Status

This repository is actively used for personal developer tools and may grow as additional utilities are created.

## License

The repository includes an [MIT License](./LICENSE). Refactor Marker's [package metadata](./refactor-marker/package.json) currently declares `UNLICENSED`; these license declarations need to be aligned.
