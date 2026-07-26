# Contributing to Flicker

Thank you for considering contributing to Flicker. We welcome contributions from
everyone, whether it's a bug report, feature suggestion, documentation
improvement, or code contribution.

## Table of Contents

- [Code of Conduct](#code-of-conduct)
- [Getting Started](#getting-started)
- [How Can I Contribute?](#how-can-i-contribute)
- [Development Setup](#development-setup)
- [Pull Request Process](#pull-request-process)
- [Style Guidelines](#style-guidelines)
- [Community](#community)

## Code of Conduct

This project and everyone participating in it is governed by our [Code of Conduct](CODE_OF_CONDUCT.md). By participating, you are expected to uphold this code. Please report unacceptable behavior to [conduct@embrly.ca](mailto:conduct@embrly.ca).

## Getting Started

### Prerequisites

Before you begin, ensure you have the following installed:

- [Node.js](https://nodejs.org/) 18+ or [Bun](https://bun.sh/) (recommended)
- [Rust](https://rustup.rs/) (latest stable)
- [Git](https://git-scm.com/)

### Fork and Clone

1. Fork the repository on GitHub.
2. Clone your fork locally:
   ```bash
   git clone https://github.com/YOUR_USERNAME/Flicker.git
   cd Flicker
   ```
3. Add the upstream remote:
   ```bash
   git remote add upstream https://github.com/EmberlyOSS/Flicker.git
   ```

## How Can I Contribute?

### Reporting Bugs

Before creating a bug report, please check existing issues to avoid duplicates.
Use the [bug report template](.github/ISSUE_TEMPLATE/bug_report.md) and include:

- A clear title describing the issue
- Steps to reproduce the behavior
- Expected vs. actual behavior
- Screenshots, if applicable
- Environment details: OS and version, Flicker version, relevant logs

### Suggesting Features

Use the [feature request template](.github/ISSUE_TEMPLATE/feature_request.md). When suggesting a feature:

- Check existing issues to avoid duplicates
- Describe the problem your feature would solve
- Propose a solution if you have one
- Note any alternatives you've considered

### Contributing Code

1. Find an issue to work on, or open one to discuss your idea first.
2. Comment on the issue to let others know you're working on it.
3. Create a branch for your work.
4. Make your changes, following the style guidelines below.
5. Test your changes thoroughly (see Development Setup).
6. Submit a pull request.

## Development Setup

```bash
# Install dependencies
bun install

# Run the frontend only (vite dev server)
bun run dev

# Run the full desktop app in development mode
bun run tauri:dev

# Build for production (includes a full TypeScript type check)
bun run tauri:build
```

### Project Structure

```
.
├── src/                  # React frontend source
│   ├── components/       # React components
│   ├── hooks/            # Custom React hooks
│   ├── context/          # React context providers
│   ├── utils/            # Shared utility functions
│   ├── types.ts          # TypeScript type definitions
│   ├── config.ts         # Configuration utilities
│   ├── constants.ts      # App constants
│   └── App.tsx           # Main app component
├── src-tauri/            # Rust backend source
│   ├── src/
│   │   ├── lib.rs         # Tauri command registration
│   │   ├── common/        # Shared logic (upload, config, audit, etc.)
│   │   ├── desktop/        # Windows/macOS/Linux-specific code
│   │   └── mobile/         # Android/iOS-specific code
│   ├── Cargo.toml         # Rust dependencies
│   └── tauri.conf.json    # Tauri configuration
├── .github/              # Issue templates and CI workflows
└── public/               # Static assets
```

## Pull Request Process

1. Update documentation if your change affects behavior described in it.
2. Add tests for new functionality where practical.
3. Ensure `bun run tauri:build` succeeds (this runs the TypeScript build and a Rust compile via `beforeBuildCommand`).
4. Update the README if you've added or changed a user-facing feature.
5. Follow the commit message conventions below.
6. Request review from a maintainer.

### Commit Message Format

We follow [Conventional Commits](https://www.conventionalcommits.org/):

```
<type>(<scope>): <description>

[optional body]

[optional footer]
```

Types:
- `feat`: New feature
- `fix`: Bug fix
- `docs`: Documentation changes
- `style`: Code style changes (formatting, etc.)
- `refactor`: Code refactoring
- `test`: Adding or updating tests
- `chore`: Maintenance tasks

Examples:
```
feat(upload): add multi-file drag-and-drop support
fix(hotkeys): register clipboard-upload hotkey on config change
docs(readme): correct default hotkey table
```

## Style Guidelines

### TypeScript/React

- Use TypeScript for all new code.
- Follow the existing code style in the file you're editing.
- Use functional components with hooks.
- Keep components small and focused.
- Use meaningful variable and function names.

### Rust

- Follow standard Rust naming conventions.
- Format with `cargo fmt` before committing.
- Add doc comments for public functions where the purpose isn't obvious from the signature.
- Handle errors explicitly; avoid `unwrap()`/`expect()` outside of tests.

### CSS

- Use the existing CSS variables (`src/index.css`) for theming rather than hardcoded colors.
- Prefer Tailwind utility classes; reserve custom CSS classes for shared patterns (glass surfaces, glow effects, etc.) already defined in `index.css`.

## Community

- **Discord**: [embrly.ca/discord](https://embrly.ca/discord)
- **Email**: [hello@embrly.ca](mailto:hello@embrly.ca)

## Questions?

Open a GitHub issue, ask in Discord, or email us — see [Community](#community) above.

---

Thank you for contributing to Flicker.
