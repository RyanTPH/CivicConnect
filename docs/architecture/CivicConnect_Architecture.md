# CivicConnect — High-Level Architecture

## Overview

CivicConnect follows a **Modular Monolith** architecture. The application is organised into distinct layers and modules while operating within the same application process.

The architecture separates presentation, authentication and authorisation, application services, domain logic, infrastructure, and data persistence. **Supabase Auth** provides authentication, while **PostgreSQL Row Level Security (RLS)** provides the primary database-level authorisation boundary for role-based access.

The architecture also applies the design decisions established for Milestone 2:

- **Dependency Inversion Principle (DIP)** for appropriate internal module dependencies.
- **Adapter Pattern** at the boundary between CivicConnect and external or legacy municipal systems.

## Architecture Diagram
<img width="1454" height="820" alt="image" src="https://github.com/user-attachments/assets/19408af1-89a5-439d-93b7-78c7b742a813" />


## Layer Responsibilities

### 1. Presentation Layer

The Presentation Layer provides the web interface through which citizens, municipal staff, and administrators interact with CivicConnect.

**Primary responsibility:**

- Display application functionality.
- Capture user input.
- Present application results.
- Pass authenticated requests to the application layer.

### 2. Authentication and Authorisation

CivicConnect uses **Supabase Auth** for authentication.

Authentication establishes the identity of the user and provides an authenticated session/JWT that can be used by the application and Supabase services.

Authorisation is enforced primarily through **PostgreSQL Row Level Security (RLS)** policies. These policies control which records an authenticated user can access or modify according to the application's role and access rules.

Therefore, the architecture does not treat RBAC as a generic middleware component. Instead:

**Authentication**

`Supabase Auth → authenticated session/JWT`

**Authorisation**

`authenticated user/role context → RLS policies → permitted database operations`

### 3. Application Layer

The Application Layer contains the main CivicConnect services:

- **Request Processing Service**
- **Notification Service**
- **User Management Service**

These services coordinate application use cases and should not contain unnecessary knowledge of concrete infrastructure implementations.

### 4. Domain Layer

The Domain Layer contains the business concepts and rules that are central to CivicConnect.

Examples include:

- Request Domain Models
- Notification Domain Models
- User Domain Models

The domain layer represents business logic rather than infrastructure-specific implementation details.

### 5. Infrastructure Layer

The Infrastructure Layer provides implementations required by the application and domain layers.

Examples include:

- Data Persistence / Repositories
- Notification Adapters

This layer is where concrete technology-specific implementations can be placed.

## Design Pattern Application

### Dependency Inversion Principle

DIP is applied where internal CivicConnect modules have dependencies that would otherwise create unnecessary coupling.

Conceptually:

```text
High-level application service
          |
          v
      Interface
          ^
          |
Concrete infrastructure implementation
```

For example, Request Processing should depend on an appropriate persistence abstraction rather than directly depending on a concrete database implementation.

This supports **NFR-010 (Maintainability)** by allowing an implementation to change without requiring unrelated high-level modules to change.

DIP should not be applied indiscriminately. Additional interfaces should only be introduced where they provide a meaningful dependency boundary.

### Adapter Pattern

The Adapter Pattern is used at the integration boundary between CivicConnect and external or legacy systems.

```text
CivicConnect
     |
     v
Adapter / Translation Layer
     |
     v
External or Legacy Municipal System
```

The Adapter translates between CivicConnect's expected interface and an incompatible external interface without requiring either system to be substantially changed.

This is particularly relevant where CivicConnect must communicate with:

- Legacy municipal systems.
- Government services.
- Third-party services with incompatible APIs.

The Adapter is therefore an **external integration mechanism**, rather than an alternative to DIP for internal CivicConnect dependencies.

## Data and Security Boundary

Supabase PostgreSQL provides the primary persistence layer.

```text
Application Services
       |
       v
Repositories / Data Access
       |
       v
PostgreSQL RLS Policies
       |
       v
Supabase PostgreSQL + PostGIS
```

RLS provides a database-level security boundary so that access restrictions are enforced close to the data rather than relying exclusively on application-level checks.

This is particularly relevant to:

- **NFR-002 / NFR-003 — Security**
- **NFR-004 — Data Integrity**
- **NFR-009 — Auditability**

## External Integration Boundary

External systems are outside the CivicConnect Modular Monolith boundary.

Communication with these systems occurs through an integration boundary:

```text
CivicConnect Application
        |
        v
Adapter
        |
        | HTTPS / REST API
        v
External / Legacy Municipal System
```

This distinction is important because the **Modular Monolith** and **Adapter Pattern** solve different problems:

- The Modular Monolith structures the internal CivicConnect application.
- DIP manages appropriate internal dependencies.
- The Adapter Pattern manages incompatible external interfaces.

## Architecture Decision Context

M2-03 selects a **Modular Monolith** for CivicConnect's overall architecture. The Adapter Pattern does not conflict with this decision because external systems remain outside the application's architectural boundary.

Likewise, DIP does not require CivicConnect to become a distributed system. It is an internal dependency-management principle that can be applied within the Modular Monolith.

## Traceability

| Architecture Element | Related Requirement / Decision |
|---|---|
| Supabase Auth | NFR-002 / NFR-003 — Security |
| PostgreSQL RLS | NFR-002 / NFR-003 — Authorisation and access control |
| PostgreSQL + PostGIS | Data persistence requirements |
| Modular Monolith | M2-03 architecture decision |
| DIP / Interfaces | NFR-010 — Maintainability |
| Adapter Pattern | M2 Design Problem 1 decision |
| External/Legacy Integration Boundary | Design Problem 1 — Adapter Pattern |
| Repositories / Persistence | NFR-004 — Data Integrity |
| Lifecycle records / audit support | NFR-009 — Auditability |

## Related Documentation

- **M2-02** — Architecturally Significant Requirements (ASRs) and Quality Drivers
- **M2-03** — Overall Architecture Decision
- **M2-06** — Affected Modules, Components, Classes and Interfaces
- **Design Problem 1** — Excessive Dependencies between CivicConnect Components
- **Assignment 2 — Task 1** — Design Quality & Design Patterns
