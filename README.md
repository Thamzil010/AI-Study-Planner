# AI Smart Study Planner

A full-stack web application designed to help students create personalized study schedules, track progress, and calculate exam readiness scores.

## Tech Stack
- **Frontend**: React, TypeScript, Vite, Tailwind CSS
- **Backend**: Node.js, Express, TypeScript, Prisma ORM
- **Database**: PostgreSQL
- **Caching**: Redis

## Prerequisites
- Node.js (v18+)
- Docker and Docker Compose

## Quick Start

### 1. Start Infrastructure (PostgreSQL & Redis)
Ensure Docker is running, then start the containers:
```bash
docker-compose up -d postgres redis
```

### 2. Backend Setup
Navigate to the `backend` directory, install dependencies, and start the server:
```bash
cd backend
npm install
npx prisma db push
npx prisma generate
npm run dev
```
The backend API will be available at `http://localhost:5000`.

### 3. Frontend Setup
Open a new terminal, navigate to the `frontend` directory, install dependencies, and start the dev server:
```bash
cd frontend
npm install
npm run dev
```
The frontend application will be available at `http://localhost:5173`.

## Features Implemented
- User Registration & Authentication (JWT)
- Role-based Dashboard & Reports
- Subject Management CRUD
- AI-based Study Schedule Generation (Heuristic Placeholder)
- Progress Tracking & Exam Readiness Score
- Database Schema and RESTful APIs

## Environment Variables
Ensure `.env` in the root and `backend/.env` have the correct settings based on `.env.example`.
