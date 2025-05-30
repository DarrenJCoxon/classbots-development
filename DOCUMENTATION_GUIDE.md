# ClassBots Documentation Guide

This guide explains the purpose of various documentation files in the project root.

## Design & UI Documentation

### COLOR_SCHEME.md
Defines the official color palette and design system for ClassBots. Reference this when implementing UI components to ensure visual consistency.

### BUTTON_MIGRATION_GUIDE.md
Active migration guide for standardizing button components across the application. Contains uncompleted tasks for UI component unification.

### UNIFIED_COMPONENT_STATUS.md
Tracks the progress of UI component standardization efforts. Shows which components have been unified and which still need work.

## Feature Documentation

### SAFETY_FEATURE.md
Explains the safety monitoring system architecture, including:
- How the system detects concerning messages
- Alert mechanisms for teachers
- Future enhancement plans

### COUNTRY_HELPLINES.md
Documentation for the helpline support feature:
- How to add new countries
- Testing procedures
- Data structure for helpline information

## Performance & Optimization

### performance-optimizations.md
Comprehensive guide for performance improvements including:
- Database optimization strategies
- Frontend performance enhancements
- Caching implementations
- Monitoring and metrics

## Database Documentation

See `/supabase/migrations/README.md` for database schema setup and migration instructions.

## Development Workflow

When working on the project:
1. Check relevant documentation before implementing features
2. Update documentation when making significant changes
3. Follow the design guidelines in COLOR_SCHEME.md
4. Complete any outstanding tasks in the migration guides