# ADR 0002: Freeze MVP Stack

## Status

Accepted

## Context

Project documents reference multiple stack directions, including alternatives that are not currently implemented.

## Decision

The official MVP stack is:

- React plus Vite for frontend
- FastAPI for backend
- PostgreSQL for primary persistence
- Redis Streams and Pub/Sub for eventing and notifications
- Docker Compose for local development

Technologies such as Next.js, NestJS, Neo4j, pgvector, Kafka, and NATS remain future candidates only.

## Consequences

Benefits:

- reduces ambiguity
- prevents stack churn
- aligns roadmap with the actual codebase

Tradeoffs:

- some future ideas are intentionally deferred

