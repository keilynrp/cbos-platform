> **\xe2\x9a\xa0\xef\xb8\x8f ARCHIVED** \xe2\x80\x94 This document is historical reference only. It has been superseded by the governing architecture (ADRs 0001\xe2\x80\x930010) and current capability specs in `docs/capabilities/`. Do not use for implementation decisions.

---

# Neural Graph -- Initial System Diagram

## Overview

The ERP Neural Graph represents the operational relationships between
modules, data entities, AI capabilities and physical devices.

## Core Node Categories

Module Entity Event Workflow Interface AI Capability Device Data Source

## High-Level Graph

CRM → emits LeadCreated → writes Lead Entity

Lead Entity → triggers RevPath Stage

RevPath → invokes AI Qualification Prompt

AI Prompt → routed through MCP Integration Hub → invokes Model
Capability

Model Capability → returns insights to CRM Dashboard

Commerce Flow

Product → Inventory

Inventory → Storefront → POS

POS → emits OrderCreated

OrderCreated → triggers Payment → updates CRM Purchase History

IoT Flow

Temperature Sensor → emits TelemetryEvent

TelemetryEvent → IoT Rule Engine

IoT Rule → Warehouse Alert

Warehouse Alert → Notification Engine

## Graph Layers

Experience Layer Portal / Store / POS

Business Layer CRM / Commerce / Contracts / Warehouse

Orchestration Layer Events / Workflows / Automation

Intelligence Layer AI Agents / Prompts / Knowledge Graph

Data Layer Postgres / GraphDB / Vector Index

Infrastructure Layer Services / Containers / Observability
