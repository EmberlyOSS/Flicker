# Contributing to Flicker

First off, thank you for considering contributing to Flicker! 🎉

It's people like you that make Emberly such a great tool. We welcome contributions from everyone, whether it's a bug report, feature suggestion, documentation improvement, or code contribution.

## 📋 Table of Contents

- [Code of Conduct](#code-of-conduct)
- [Getting Started](#getting-started)
- [How Can I Contribute?](#how-can-i-contribute)
- [Development Setup](#development-setup)
- [Pull Request Process](#pull-request-process)
- [Style Guidelines](#style-guidelines)
- [Community](#community)

## 📜 Code of Conduct

This project and everyone participating in it is governed by our [Code of Conduct](CODE_OF_CONDUCT.md). By participating, you are expected to uphold this code. Please report unacceptable behavior to [conduct@embrly.ca](mailto:conduct@embrly.ca).

## 🚀 Getting Started

### Prerequisites

Before you begin, ensure you have the following installed:

- [Node.js](https://nodejs.org/) 18+ or [Bun](https://bun.sh/) (recommended)
- [Rust](https://rustup.rs/) (latest stable)
- [Git](https://git-scm.com/)

### Fork and Clone

1. Fork the repository on GitHub
3. Clone your fork locally:
   ```bash
   git clone https://github.com/YOUR_USERNAME/Flicker.git
   cd Flicker/uploader
   ```
3. Add the upstream remote:
   ```bash
   git remote add upstream https://github.com/EmberlyOSS/Flicker.git
   ```

## 💡 How Can I Contribute?

### Reporting Bugs

Before creating a bug report, please check existing issues to avoid duplicates.

When creating a bug report, include:

- **Clear title** describing the issue
- **Steps to reproduce** the behavior
- **Expected behavior** vs **actual behavior**
- **Screenshots** if applicable
- **Environment details**:
  - OS and version
  - App version
  - Relevant logs

### Suggesting Features

We love feature suggestions! When suggesting a feature:

- **Check existing issues** to avoid duplicates
- **Describe the problem** your feature would solve
- **Propose a solution** if you have one
- **Consider alternatives** you've thought about

### Contributing Code

1. **Find an issue** to work on or create one
2. **Comment on the issue** to let others know you're working on it
3. **Create a branch** for your work
4. **Make your changes** following our style guidelines
5. **Test your changes** thoroughly
6. **Submit a pull request**

## 🛠️ Development Setup

```bash
# Install dependencies
bun install

# Run in development mode
bun run tauri dev

# Run type checking
bun run build

# Build for production
bun run tauri build
```

### Project Structure

```
uploader/
├── src/                  # React frontend source
│   ├── components/       # React components
│   ├── hooks/           # Custom React hooks
│   ├── types.ts         # TypeScript type definitions
│   ├── config.ts        # Configuration utilities
│   ├── constants.ts     # App constants
│   └── App.tsx          # Main app component
├── src-tauri/           # Rust backend source
│   ├── src/
│   │   └── lib.rs       # Main Rust code
│   ├── Cargo.toml       # Rust dependencies
│   └── tauri.conf.json  # Tauri configuration
└── public/              # Static assets
```

## 📤 Pull Request Process

1. **Update documentation** if needed
2. **Add tests** for new functionality
3. **Ensure all tests pass**
4. **Update the README** if you've added features
5. **Follow commit message conventions** (see below)
6. **Request review** from maintainers

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
feat(screenshot): add region selection support
fix(upload): handle network timeout errors
docs(readme): update installation instructions
```

## 🎨 Style Guidelines

### TypeScript/React

- Use TypeScript for all new code
- Follow existing code style
- Use functional components with hooks
- Keep components small and focused
- Use meaningful variable and function names

### Rust

- Follow Rust naming conventions
- Use `rustfmt` for formatting
- Add documentation comments for public functions
- Handle errors appropriately

### CSS

- Use CSS variables for theming
- Follow BEM-like naming for custom classes
- Prefer Tailwind utility classes where appropriate

## 🌐 Community

- **Discord**: Join us at [embrly.ca/discord](https://embrly.ca/discord)
- **GitHub Discussions**: For longer conversations
- **Twitter/X**: Follow [@EmberlyOSS](https://twitter.com/EmberlyOSS) for updates

## ❓ Questions?

Don't hesitate to ask questions! You can:

- Open a GitHub Discussion
- Ask in our Discord server
- Email us at [hello@embrly.ca](mailto:hello@embrly.ca)

## 🙏 Thank You!

Your contributions make Emberly better for everyone. We appreciate your time and effort!

---

<div align="center">

Made with ❤️ by the [Emberly Community](https://embrly.ca)

</div>
