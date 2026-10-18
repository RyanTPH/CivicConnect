# CivicConnect

CivicConnect is a service request management application developed for the SEN381 project. The system is intended to allow users to report service-related issues, receive a reference number and track the progress of their requests.

The repository contains both the application implementation and the controlled engineering evidence used throughout the project.

## Current Implementation

Milestone 2 marks the start of meaningful application development.

The current application allows a user to:

- enter a service request category;
- enter a request title and description;
- submit the request;
- receive a unique CivicConnect reference number;
- receive an initial `Submitted` status.

The current request flow runs locally in the React application.

Initial Supabase/PostgreSQL persistence artefacts have also been added. The request form is not yet connected to live database persistence.

## Technology

The current implementation uses:

- React 19
- JavaScript
- Vite 8
- Supabase JavaScript client
- PostgreSQL through Supabase
- Vitest
- ESLint

Local development and verification were performed using:

- Node.js 24.14.0
- npm 11.9.0

Exact package versions are recorded in:

```text
src/client/package.json
src/client/package-lock.json

Repository Structure
CivicConnect/
├── .github/
│   ├── PULL_REQUEST_TEMPLATE.md
│   └── issue-tasks/
├── docs/
├── evidence/
├── src/
│   └── client/
│       ├── public/
│       └── src/
│           ├── features/
│           │   └── requests/
│           └── lib/
├── supabase/
│   └── migrations/
├── tests/
└── README.md

Current Application Components
Request Form
src/client/src/features/requests/RequestForm.jsx

Provides the current service request form and displays the generated reference number and initial request status.
Request Service
src/client/src/features/requests/requestService.js

Contains the initial request creation logic, required-field validation, reference number generation and default Submitted status.
Supabase Request Repository
src/client/src/features/requests/supabaseRequestRepository.js

Provides the initial persistence boundary between the request feature and Supabase.
The repository has been prepared but is not yet called by the request form because authentication and Row Level Security policies still need to be finalised.
Supabase Client
src/client/src/lib/supabaseClient.js

Creates the Supabase client when the required environment configuration is available.
Database Migration
supabase/migrations/001_initial_request_schema.sql

Contains the initial PostgreSQL schema for:
- request categories;
- request statuses;
- service requests;
- request status history.
It also includes relationships, basic integrity constraints, initial request statuses and Row Level Security activation on request-related tables.
Setup
1. Install dependencies
From the repository root:
cd src/client
npm install

2. Configure the environment
Copy:
.env.example

to:
.env

Provide the required Supabase values:
VITE_SUPABASE_URL=your_supabase_project_url
VITE_SUPABASE_ANON_KEY=your_supabase_anon_key

Real environment files are excluded from Git and must not be committed.
3. Run the application
npm run dev

Open the local URL shown by Vite, normally:
http://localhost:5173/

Verification
The current application has the following repeatable checks.
Automated tests
npm test

The current request-service tests check:
- successful service request creation;
- rejection of requests with missing required fields;
- removal of unnecessary spaces from request input.
Linting
npm run lint

Production build
npm run build

At the current Milestone 2 checkpoint:
- 3 request-service tests pass;
- linting passes;
- the production build completes successfully.
Current Limitations
The following items are not yet complete at the current Milestone 2 stage:
- the request form is not yet writing to Supabase;
- authentication and application roles are not yet connected;
- final Row Level Security policies are not yet defined;
- approved service request categories have not yet been seeded;
- the category field currently uses manual input;
- SMS and WhatsApp notification behaviour has not yet been simulated;
- additional CivicConnect functionality is still to be developed;
- production deployment has not yet been completed.
These items will be progressed as the related architecture, data, security and interface decisions are finalised.
GitHub Engineering Controls
CivicConnect uses a controlled GitHub workflow so that both documentation and application development produce visible engineering evidence.
Substantive work is tracked through:
- GitHub Issues;
- working branches;
- meaningful commits;
- Pull Requests;
- peer reviews.
Feature and documentation branches are integrated through Pull Requests rather than being added directly to the protected integration branches.
Repository governance documentation and supporting evidence are maintained under:
.github/
docs/
evidence/

Issue Labels
Issues use labels to identify the type of work, milestone and priority.
Category	Example labels	Purpose
Type	feature, docs, bug, chore, infra, test, research	Identifies the kind of engineering work
Milestone	milestone-1, milestone-2, milestone-3, milestone-4	Identifies the project stage
Priority	priority-critical, priority-high, priority-medium, priority-low	Indicates urgency and importance


The GitHub issues are used to track work, while the PED, RTM, ADRs, repository artefacts and reviewed Pull Requests provide the main controlled engineering evidence.
Milestone 2 Development
The current meaningful application development is being progressed through:
M2-13-meaningful-development

The Project Engineering Document, RTM and supporting engineering evidence will be updated to reflect the final Milestone 2 implementation and decisions after the current work has been reviewed.