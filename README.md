# ArchBridge Architects

You are building a full-stack web application called "ArchBridge" — 
a Presales-to-Delivery Solution Architecture platform for Penguin AI, 
a healthcare AI startup (~40 people) that builds Digital Workers for 
prior authorization, HCC coding, claims scrubbing, denials management, 
and appeals management.

## What You Are Building

A multi-user, multi-project platform where Solution Architects, Sales, 
and Delivery teams collaborate on customer engagements. The app ingests 
documents (meeting notes, transcripts, product docs, diagrams), uses 
Claude AI to extract structured insights, and generates architecture 
artifacts and documentation.

Phase 1 covers: Auth, Project management, and the full UI shell.

---

## Tech Stack

- Frontend: React + Vite + TypeScript + Tailwind CSS
- Backend: Node.js + Express + TypeScript
- Database: PostgreSQL with node-postgres (pg)
- Auth: JWT (jsonwebtoken) + bcrypt
- API communication: Axios (frontend) + Express Router (backend)
- File structure: Monorepo with /client and /server directories

---

## Database Schema (Phase 1)

Create a db/schema.sql file with the following tables:

```sql
-- Users
CREATE TABLE users (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  email VARCHAR(255) UNIQUE NOT NULL,
  password_hash VARCHAR(255) NOT NULL,
  full_name VARCHAR(255) NOT NULL,
  role VARCHAR(50) DEFAULT 'member', -- 'admin' | 'member'
  avatar_initials VARCHAR(5),
  created_at TIMESTAMP DEFAULT NOW()
);

-- Projects
CREATE TABLE projects (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name VARCHAR(255) NOT NULL,
  customer_name VARCHAR(255) NOT NULL,
  description TEXT,
  status VARCHAR(50) DEFAULT 'active', -- 'active' | 'archived' | 'closed'
  owner_id UUID REFERENCES users(id),
  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW()
);

-- Project Members
CREATE TABLE project_members (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  project_id UUID REFERENCES projects(id) ON DELETE CASCADE,
  user_id UUID REFERENCES users(id) ON DELETE CASCADE,
  role VARCHAR(50) DEFAULT 'contributor', -- 'owner' | 'contributor' | 'viewer'
  added_at TIMESTAMP DEFAULT NOW(),
  UNIQUE(project_id, user_id)
);

-- Documents (Phase 2 will add parsing columns)
CREATE TABLE documents (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  project_id UUID REFERENCES projects(id) ON DELETE CASCADE,
  uploaded_by UUID REFERENCES users(id),
  file_name VARCHAR(500) NOT NULL,
  file_type VARCHAR(50) NOT NULL, -- 'pdf' | 'txt' | 'pptx' | 'image' | 'docx'
  file_path VARCHAR(1000) NOT NULL,
  file_size_bytes INTEGER,
  parse_status VARCHAR(50) DEFAULT 'pending', -- 'pending' | 'processing' | 'done' | 'error'
  extracted_text TEXT,
  created_at TIMESTAMP DEFAULT NOW()
);

-- Project Insights (AI-extracted structured data)
CREATE TABLE project_insights (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  project_id UUID REFERENCES projects(id) ON DELETE CASCADE UNIQUE,
  pain_points JSONB DEFAULT '[]',
  customer_goals JSONB DEFAULT '[]',
  problem_statement TEXT,
  current_workflows JSONB DEFAULT '[]',
  solution_components JSONB DEFAULT '[]',
  implementation_roadmap JSONB DEFAULT '[]',
  expected_outcomes JSONB DEFAULT '[]',
  last_generated_at TIMESTAMP,
  updated_at TIMESTAMP DEFAULT NOW()
);

-- Chat Messages
CREATE TABLE chat_messages (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  project_id UUID REFERENCES projects(id) ON DELETE CASCADE,
  user_id UUID REFERENCES users(id),
  role VARCHAR(20) NOT NULL, -- 'user' | 'assistant'
  content TEXT NOT NULL,
  sources JSONB DEFAULT '[]', -- [{doc_id, doc_name, quote, relevance}]
  created_at TIMESTAMP DEFAULT NOW()
);

-- AI Templates
CREATE TABLE ai_templates (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name VARCHAR(255) NOT NULL,
  template_type VARCHAR(100) NOT NULL, -- 'sow' | 'brd' | 'architecture_doc' | 'pain_points' | etc.
  system_prompt TEXT NOT NULL,
  user_prompt_template TEXT NOT NULL,
  is_active BOOLEAN DEFAULT TRUE,
  created_at TIMESTAMP DEFAULT NOW()
);

-- System Configuration (master prompt lives here)
CREATE TABLE system_config (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  config_key VARCHAR(255) UNIQUE NOT NULL,
  config_value TEXT NOT NULL,
  updated_by UUID REFERENCES users(id),
  updated_at TIMESTAMP DEFAULT NOW()
);

-- Generated Documents
CREATE TABLE generated_documents (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  project_id UUID REFERENCES projects(id) ON DELETE CASCADE,
  template_id UUID REFERENCES ai_templates(id),
  generated_by UUID REFERENCES users(id),
  document_type VARCHAR(100) NOT NULL,
  title VARCHAR(500) NOT NULL,
  content TEXT NOT NULL,
  sources JSONB DEFAULT '[]',
  version INTEGER DEFAULT 1,
  created_at TIMESTAMP DEFAULT NOW()
);
```

---

## Seed Data

Create db/seed.sql with:

1. A default admin user: email: admin@penguinai.com, password: Admin123! 
   (pre-hashed with bcrypt rounds=10)
2. A default master system prompt in system_config with key: 
   'master_system_prompt' and this value:

"You are ArchBridge AI, an expert Solutions Architect specializing in 
AI-powered healthcare revenue cycle management and administrative 
automation. You work exclusively in the context of Penguin AI, a 
healthcare AI company that deploys Digital Workers to automate 
workflows including: Prior Authorization, HCC Coding, Claims 
Scrubbing, Denials Management, and Appeals Management.

Your role is to serve as a neutral, expert advisor between Sales, 
Solution Architecture, Product, and Delivery teams. You have no 
political agenda — your only goal is to arrive at the best solution 
for the customer based on evidence.

CORE BEHAVIORAL RULES:
1. ALWAYS cite your sources. When making any claim or recommendation, 
   reference the specific document it came from, quote the relevant 
   passage, and explain your reasoning chain.
2. Structure every substantive response as: 
   [Finding] → [Source + Evidence] → [Reasoning] → [Recommendation]
3. Be honest about gaps. If customer needs cannot be met by current 
   Penguin AI products, say so clearly and suggest how the gap could 
   be filled (custom build, partner, phased approach).
4. Remain neutral in disputes between internal teams. Present the 
   evidence and let the data guide the decision.
5. Flag ambiguity. If customer intent is unclear from the documents, 
   say so and suggest what clarifying questions should be asked.
6. Think in outcomes, not features. Always connect solution components 
   back to the specific customer goals and measurable outcomes.
7. Match the detail level to the audience. Executive summary for 
   leadership, technical depth for architects, process clarity for 
   delivery teams."

3. Seed 3 default AI templates:
   - Pain Points extraction prompt
   - Solution Components mapping prompt  
   - Problem Statement generation prompt
   (write appropriate prompts for each)

---

## Backend Structure

/server
  /src
    /routes
      auth.ts          -- POST /api/auth/register, /api/auth/login, /api/auth/me
      projects.ts      -- GET/POST/PUT/DELETE /api/projects
      projectMembers.ts -- GET/POST/DELETE /api/projects/:id/members
      documents.ts     -- GET /api/projects/:id/documents (upload in Phase 2)
      insights.ts      -- GET /api/projects/:id/insights
      chat.ts          -- GET /api/projects/:id/chat
      config.ts        -- GET/PUT /api/config/system-prompt (admin only)
    /middleware
      auth.ts          -- JWT verification middleware
      adminOnly.ts     -- Role check middleware
    /db
      index.ts         -- pg Pool setup, reads DATABASE_URL from env
    app.ts
    server.ts
  .env.example

---

## Frontend Structure

/client
  /src
    /components
      /layout
        Sidebar.tsx         -- Project list sidebar, user avatar, logout
        TopNav.tsx          -- Project name, breadcrumb, user menu
        AppShell.tsx        -- Sidebar + TopNav + main content area
      /ui
        Button.tsx
        Input.tsx
        Modal.tsx
        Badge.tsx
        Card.tsx
        Spinner.tsx
      /auth
        LoginPage.tsx
        RegisterPage.tsx
        ProtectedRoute.tsx
      /projects
        ProjectList.tsx      -- Dashboard: grid of project cards
        ProjectCard.tsx
        CreateProjectModal.tsx
        ProjectMembersModal.tsx
    /pages
      /project
        ProjectShell.tsx     -- Loads project, renders tab nav
        tabs/
          InsightsTab.tsx    -- 7 structured panels (empty state in Phase 1)
          DocumentsTab.tsx   -- Empty state in Phase 1
          ChatTab.tsx        -- Empty state in Phase 1
          GeneratedDocsTab.tsx
          SettingsTab.tsx    -- Project name, members, owner
    /hooks
      useAuth.ts
      useProject.ts
    /api
      client.ts            -- Axios instance with JWT interceptor
      auth.ts
      projects.ts
    /context
      AuthContext.tsx
    /types
      index.ts             -- All shared TypeScript interfaces
    App.tsx                -- React Router setup
    main.tsx

---

## Routing

Public routes:
  /login
  /register

Protected routes (require JWT):
  /                        -- Redirects to /projects
  /projects                -- Project dashboard
  /projects/:id            -- Project shell, defaults to Insights tab
  /projects/:id/documents
  /projects/:id/chat
  /projects/:id/generated
  /projects/:id/settings
  /admin/config            -- Admin only: master prompt editor

---

## UI Design Requirements

Use Tailwind CSS. Design should feel like a professional B2B SaaS tool:
- Color palette: Dark navy sidebar (#0f1729), white main area, 
  blue accents (#2563eb), subtle gray borders
- Sidebar shows: ArchBridge logo/wordmark at top, list of user's 
  projects with status dot, bottom section with user avatar + name + logout
- Top nav: current project name + customer name, tab navigation, 
  right side: "Add Document" button (disabled in Phase 1) + user menu
- Project cards on dashboard: show customer name, project name, 
  status badge, owner, contributor count, last updated
- Tab content areas: use a two-panel layout where applicable 
  (left: structured list, right: detail/AI output)
- Empty states: every tab should have a meaningful empty state that 
  explains what will appear there and what action to take

---

## Insights Tab Structure (Phase 1: UI Shell Only)

Render 7 collapsible panels, each with an empty state and a 
"Generate" button (disabled in Phase 1, wired in Phase 2):

1. Customer Pain Points
   Icon: ⚡ | Description: "AI-extracted pain points from meeting notes 
   and transcripts"
   
2. Customer Goals  
   Icon: 🎯 | Description: "Strategic and operational goals identified 
   across all project documents"
   
3. Problem Statement
   Icon: 📋 | Description: "A synthesized problem statement generated 
   from all customer inputs"
   
4. Current State Workflows
   Icon: 🔄 | Description: "Customer's existing workflows mapped from 
   discovery sessions"
   
5. Proposed Solution Components
   Icon: 🧩 | Description: "Recommended Penguin AI Digital Workers and 
   custom components with reasoning"
   
6. Implementation Roadmap
   Icon: 🗺️ | Description: "Phased delivery plan mapped to customer 
   goals and constraints"
   
7. Expected Outcomes
   Icon: 📈 | Description: "Measurable outcomes and value metrics 
   tied to each solution component"

---

## Auth Flow

- Register: email, full_name, password (min 8 chars) → JWT returned
- Login: email + password → JWT (expires 7d) stored in localStorage
- All API calls send Authorization: Bearer <token>
- /api/auth/me validates token and returns user object
- On 401, redirect to /login

---

## Environment Variables

Server .env:
  DATABASE_URL=postgresql://localhost:5432/archbridge
  JWT_SECRET=your-secret-here
  PORT=3001
  ANTHROPIC_API_KEY=  (leave blank, wired in Phase 2)

Client .env:
  VITE_API_URL=http://localhost:3001

---

## Instructions for Claude Code

1. Create the full monorepo structure
2. Write the complete schema.sql and seed.sql
3. Implement all backend routes with proper error handling and TypeScript types
4. Build the full React frontend with React Router v6
5. Make the app fully functional: register, login, create projects, 
   assign members, navigate tabs
6. All tabs render their UI shell with proper empty states
7. Include a README.md with setup instructions:
   - npm install in both /client and /server
   - createdb archbridge
   - psql archbridge < db/schema.sql
   - psql archbridge < db/seed.sql
   - npm run dev in both directories

Do not stub or skip any component. Build the complete working Phase 1.

This project was built with [Lovable](https://lovable.dev).

**Live app**: https://archbridge-architect.lovable.app

## Build with Lovable

Continue developing this project in the [Lovable editor](https://lovable.dev/projects/c2b151f7-cda0-4252-8e81-720a07fe0525).

- **Ship faster**: describe what you want to build and Lovable handles the code.
- **Stay in sync**: every change made in Lovable is committed straight to this repository.
- **Full ownership**: this code is yours. Push to `main` on GitHub and your changes sync back into Lovable, ready for your next prompt.

## Development

Prefer working locally? You need Node.js and npm — [install with nvm](https://github.com/nvm-sh/nvm#installing-and-updating).

```sh
git clone <this-repository-url>
cd <repository-name>
npm i
npm run dev
```
