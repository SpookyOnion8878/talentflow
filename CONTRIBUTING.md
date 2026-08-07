# Contributing to TalentFlow

Thank you for your interest in contributing! This document provides guidelines and information.

## Development Setup

1. Fork the repository
2. Clone your fork: `git clone https://github.com/yourusername/talentflow.git`
3. Install dependencies: `pnpm install`
4. Copy `.env.example` to `.env` and configure
5. Setup database: `pnpm db:generate && pnpm db:push && pnpm db:seed`
6. Start dev server: `pnpm dev`

## Code Standards

- **TypeScript**: Strict mode, no `any` types
- **Components**: Functional components with hooks
- **Styling**: Tailwind CSS utility classes
- **API**: tRPC with Zod validation
- **Testing**: Vitest for unit tests, Playwright for E2E

## Pull Request Process

1. Create a feature branch: `git checkout -b feature/my-feature`
2. Make your changes with tests
3. Ensure all checks pass: `pnpm lint && pnpm test && pnpm build`
4. Submit PR against `develop` branch
5. Wait for review from maintainers

## Reporting Issues

Use GitHub Issues with the provided templates:

- **Bug Report**: Describe the bug, steps to reproduce, expected behavior
- **Feature Request**: Problem statement, proposed solution, alternatives
