> **\xe2\x9a\xa0\xef\xb8\x8f ARCHIVED** \xe2\x80\x94 This document is historical reference only. It has been superseded by the governing architecture (ADRs 0001\xe2\x80\x930010) and current capability specs in `docs/capabilities/`. Do not use for implementation decisions.

---

# Technical Architecture Overview

## Backend

-   FastAPI or NestJS
-   Modular services

## Frontend

-   Next.js
-   React
-   TypeScript
-   Tailwind

## Data Layer

-   PostgreSQL
-   pgvector
-   GraphDB / Neo4j

## Event Backbone

-   Redis Streams (MVP)
-   Kafka / NATS (future)

## AI Integration

-   MCP Hub
-   Model Providers (OpenAI, Claude, Gemini)

## Infrastructure

-   Docker
-   Traefik / Nginx
-   Cloud (AWS/GCP/Azure)

### Architecture Model

Frontend → API Gateway → Services → Event Bus → Data Layer
