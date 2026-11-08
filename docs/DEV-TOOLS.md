---
contentType: Reference
title: Modern development tools — ConstructERP Guatemala
---

# Modern development tools — ConstructERP Guatemala

This document describes the tools and modern processes implemented in the ConstructERP Guatemala project to keep code updated, secure, and high quality.

## Table of contents

1. Formatting and linting tools
2. Git tools
3. PWA tools
4. Optimization tools
5. Quality tools
6. Available scripts

## Formatting and linting tools

### Prettier

**Description:** Automatic code formatter to maintain consistency across the project.

**Configuration:** `.prettierrc`

**Usage:**

```bash
# Format all files
npm run format

# Check format without modifying
npm run format:check
```

**Main rules:**

- Trailing commas
- Single quotes
- 2-space indentation
- Line width: 100 characters
- Tailwind CSS support (plugin)

**Ignored files:** `.prettierignore`

### ESLint

**Description:** Linter for JavaScript/TypeScript that detects errors and code issues.

**Usage:**

```bash
# Check for errors
npm run lint

# Fix errors automatically
npm run lint:fix
```
