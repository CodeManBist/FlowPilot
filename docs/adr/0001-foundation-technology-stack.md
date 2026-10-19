# ADR-0001: Foundation Technology Stack

- **Status:** Accepted for the initial foundation; version-policy review pending
- **Date:** 2026-10-19

## 1. Context

FlowPilot is a workflow automation platform that will allow users to define and execute workflows composed of connected nodes.

The project needs a foundation that supports:

- A web application for users.
- An API for application requests.
- A separate worker for background execution.
- Shared types and validation rules across applications.
- Persistent data storage and background job processing.
- Automated testing, type checking, linting, formatting, and continuous integration.

The initial architecture should support these requirements while keeping development and maintenance manageable.

## 2. Decisions

### 2.1 Monorepo and package management

**Decision:** Use a pnpm workspace monorepo.

The repository contains multiple applications and shared packages, including the web application, API, worker, and shared libraries.

**Reasoning:** Keeping related code in one repository makes it easier to develop applications together, share internal packages, and coordinate changes.

**Trade-offs:** The workspace requires consistent dependency management and build configuration. Changes in shared packages may affect multiple applications.

### 2.2 Language and module system

**Decision:** Use TypeScript and ECMAScript modules (ESM).

The root project and backend packages use ESM, and TypeScript is used across the project.

**Reasoning:** TypeScript provides static type checking, while ESM provides a consistent modern JavaScript module system.

**Trade-offs:** TypeScript requires compilation or tooling support, and module configuration must remain consistent across packages.

**Open issue:** The root and backend manifests declare TypeScript `^6.0.2`, while the web manifest declares `^5.0.0`. This difference needs review before establishing a consistent version policy.

### 2.3 Web application

**Decision:** Use Next.js with React.

**Reasoning:** Next.js provides a structured framework for building the web application, routing, and production builds.

**Trade-offs:** The project must follow Next.js conventions and account for framework-specific build and rendering behavior.

### 2.4 API and background worker

**Decision:** Use NestJS for the API and a separate worker application.

**Reasoning:** NestJS provides a structured application framework. Separating the API from background execution creates a path to process jobs independently and scale the two workloads separately.

**Trade-offs:** Separate applications require additional configuration, operational coordination, and clear boundaries between request handling and background processing.

### 2.5 Shared validation

**Decision:** Use Zod in the shared package.

**Reasoning:** FlowPilot needs runtime validation for workflow definitions and other structured data. A shared validation package allows this logic to be reused across applications.

**Trade-offs:** Schemas and validation rules must be maintained carefully as the workflow format evolves.

### 2.6 Automated testing

**Decision:** Use Vitest for automated tests.

**Reasoning:** Automated tests help verify shared logic and application behavior as the project evolves.

**Trade-offs:** Tests require maintenance and must cover important success cases, failure cases, and edge conditions.

### 2.7 Data storage and background jobs

**Decision:** Use PostgreSQL for relational persistence and Redis with BullMQ for background job processing, as specified by the project architecture.

**Reasoning:** PostgreSQL provides relational data storage. Redis and BullMQ provide a foundation for queuing and processing background jobs.

**Trade-offs:** The system must account for database migrations, queue failures, retries, worker recovery, and local infrastructure setup.

## 3. Dependency version policy

The repository uses `pnpm-lock.yaml` to record resolved dependency versions for reproducible installations.

Package manifests may declare exact versions or version ranges. A declared range does not necessarily equal the version currently installed.

The initial development environment uses Node.js `24.21.0` and pnpm `12.14.0`. The lockfile and package manifests should be reviewed when verifying other dependency versions.

Dependency changes should be intentional and validated through the project's automated checks.

## 4. Consequences

### Benefits

- Related applications and shared packages can be developed together.
- Common validation logic can be reused.
- API requests and background execution have separate application boundaries.
- Automated checks help catch regressions before changes are integrated.

### Costs and trade-offs

- Workspace configuration and dependency versions need coordination.
- Separate applications increase operational complexity.
- Background processing requires reliable queue and failure-handling behavior.
- Tests and CI add development work but help protect correctness as the project grows.

## 5. Follow-up items

- Review and resolve the TypeScript version-range difference between the web package and the root/backend packages.
- Verify resolved dependency versions against `pnpm-lock.yaml`.
- Keep the documented architecture aligned with the implementation and the project blueprint.
- Validate the CI workflow on GitHub Actions before treating CI as fully verified.

## 6. References

- FlowForge AI Architecture and Development Blueprint.
- Root and workspace `package.json` files.
- `pnpm-lock.yaml`.
- `.github/workflows/ci.yml`.
