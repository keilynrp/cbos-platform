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
