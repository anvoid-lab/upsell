# Workspace Projects

This repository is a monorepo containing several isolated projects. Each project folder is treated as a separate entity with its own logic, dependencies, and internal guidelines.

## Project Map

### `/supabase`
**Role**: Database Infrastructure
This is the central data project. All database schemas, migrations, seed data, and Postgres-related configurations reside here. Both the web and AI projects depend on this infrastructure for persistence.

### `/upsell-web`
**Role**: Web Application
A completely isolated frontend and server-side project. It manages the user interface and business logic for the web platform. 
- **Isolation**: Operates as a standalone project.
- **Documentation**: Contains its own `AGENTS.md` for specific web-related contribution guidelines.
- **Connectivity**: Connects to the `/supabase` project for data access.

### `/upsell-ai`
**Role**: AI Services
A separate project dedicated to AI logic and intelligence services.
- **Isolation**: Maintains its own logic and architectural boundaries.
- **Documentation**: Will contain its own `AGENTS.md` for AI-specific implementation details.
- **Connectivity**: Uses the `/supabase` project as its primary database.

## General Workflow
When working on a specific feature, identify which project boundary it falls under. If the change affects the data model, start in `/supabase`. If it is a UI change, move to `/upsell-web`, and for AI enhancements, use `/upsell-ai`.
