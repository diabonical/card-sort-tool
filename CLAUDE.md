# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project Overview

A full-stack card sorting research tool (open/closed/hybrid), similar to Optimal Workshop. Researchers create and publish studies; participants complete them anonymously via shared link.

## Tech Stack

- **Frontend**: React + TypeScript + Vite (`/client`)
- **Backend**: Node.js + Express (`/server`)
- **Database**: SQLite via Prisma (`/server/prisma`)
- **Monorepo**: Single repo, managed from root

## Commands

```bash
npm install          # Install all dependencies (root + workspaces)
npm run dev          # Start backend and frontend concurrently
npm run build        # Build frontend and backend
```

From `/server`:
```bash
npx prisma migrate dev   # Run migrations
npx prisma studio        # Open Prisma Studio
npx prisma db seed       # Seed database
```

## Architecture

### Monorepo Layout
```
/client        React + Vite frontend
/server        Express backend
  /prisma      schema.prisma, migrations, seed
  /src         routes, controllers, services
```

### Key Domain Concepts

- **Study**: Has a type (`open` | `closed` | `hybrid`), optional max participants, optional end date. Published via sharable link.
- **Card**: Belongs to a study. Has name and optional description.
- **Category**: Researcher-defined (closed/hybrid) or participant-defined (open/hybrid).
- **Session**: Anonymous participant session. Stores start time, end time, duration. Submitted once.
- **Sort Result**: Stores which cards a participant placed in which category.

### Analysis (server-side)
- **Similarity matrix**: Card × card co-occurrence matrix (how often two cards are sorted together).
- **Hierarchical clustering**: Used to generate dendrogram from similarity matrix.
- **Agreement level**: Percentage of participants who grouped two cards identically.

### Auth
- Single-admin local login for researchers (no OAuth required).
- Participants are fully anonymous — no login, identified only by session token.
