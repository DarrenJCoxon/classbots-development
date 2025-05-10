# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Build Commands
- `npm run dev` - Start development server
- `npm run build` - Build for production
- `npm run start` - Start production server
- `npm run lint` - Run ESLint

## Code Style Guidelines
- **Imports**: Use absolute imports with '@/' prefix (e.g., `import Component from '@/components/Component'`)
- **TypeScript**: Use strict typing with explicit interfaces for props and state
- **Components**: Use functional components with React hooks
- **Styling**: Use styled-components with theme variables
- **File Structure**: 
  - One component per file
  - File names should match component names (PascalCase)
  - Place related files in appropriate feature directories
- **Error Handling**: Use try/catch blocks and propagate errors upward with descriptive messages
- **Comments**: Add file-level comments at the top of each file (e.g., `// src/components/Component.tsx`)
- **State Management**: Use React's useState/useContext for local/global state
- **Async Operations**: Use async/await pattern for asynchronous code