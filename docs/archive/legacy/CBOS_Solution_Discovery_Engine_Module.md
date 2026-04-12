> **\xe2\x9a\xa0\xef\xb8\x8f ARCHIVED** \xe2\x80\x94 This document is historical reference only. It has been superseded by the governing architecture (ADRs 0001\xe2\x80\x930010) and current capability specs in `docs/capabilities/`. Do not use for implementation decisions.

---


# Solution Discovery Engine
## Client Onboarding Intelligence Layer for a Composable AI-Driven Business OS

## Overview

The **Solution Discovery Engine** is an intelligent onboarding and diagnostic layer designed for a composable, AI-driven Business Operating System.

Its purpose is to identify a client's operational pain points, map those needs to platform capabilities, recommend the appropriate modules, and automatically bootstrap a workspace configuration.

Instead of asking customers which software modules they want, the system focuses on understanding:

- operational bottlenecks
- revenue leakage
- workflow inefficiencies
- data fragmentation
- automation gaps

From these insights, the platform dynamically composes the most suitable system configuration.

---

# Strategic Role in the Platform

The module sits between **customer acquisition** and **system activation**.

Lead / Client Acquisition
↓
Discovery & Diagnosis
↓
Capability Matching
↓
Solution Composition
↓
Workspace Bootstrap
↓
Operational Onboarding

This transforms onboarding into a **diagnostic intelligence process** rather than a static configuration step.

---

# Core Functional Components

## 1. Intake Experience Builder

Allows teams to design intelligent onboarding experiences.

Capabilities:

- guided intake forms
- conversational onboarding
- industry-specific questionnaires
- website or document analysis
- tech stack assessment
- operational pain-point surveys

---

## 2. AI Discovery Assistant

An AI-driven assistant that asks adaptive questions to understand the client's business context.

Example questions:

- Where are leads being lost?
- Which processes are still manual?
- Are sales and inventory synchronized?
- Do you sell online, offline, or both?
- What is the biggest operational bottleneck today?

The assistant uses the **MCP Integration Hub** to access large language models.

---

## 3. Pain Point Analyzer

Classifies detected problems into strategic business categories.

Pain Point Categories:

- Acquire
- Convert
- Deliver
- Operate
- Retain
- Analyze
- Automate

Each pain point includes:

- severity score
- confidence level
- affected domain
- detected signals
- recommended capabilities

---

## 4. Capability Matching Engine

Maps pain points to reusable system capabilities.

Example Capabilities:

- lead_capture
- pipeline_management
- quote_generation
- appointment_booking
- customer_portal
- order_management
- inventory_visibility
- workflow_automation
- contract_approval
- telemetry_alerting

The engine connects capabilities to modules and their dependencies.

---

## 5. Solution Composer

Generates recommended system configurations.

Example Solution Packages:

Starter
- CRM Builder
- Portal Builder

Growth
- CRM Builder
- Sales Builder
- Workflow Engine
- RevPath

Operations Plus
- Inventory & Order Builder
- POS Builder
- Warehouse Builder

Each recommendation includes:

- modules
- capabilities
- complexity level
- expected outcomes
- quick wins
- implementation phases

---

## 6. Workspace Bootstrap Engine

Automatically provisions an initial workspace environment.

Provisioning Tasks:

- enable modules
- configure feature flags
- generate pipelines
- create workflows
- apply templates
- create dashboards
- configure portal pages
- generate onboarding tasks

---

# Key Platform Integrations

CRM Builder  
Stores discovery insights such as pain points, summaries and recommendations.

RevPath Builder  
Maps detected pain points to the revenue lifecycle.

Persona Builder  
Identifies roles influencing system configuration.

Portal Builder  
Hosts the onboarding and diagnostic interfaces.

Dynamic Experience Mapping  
Customizes the onboarding experience based on persona and industry.

Workflow Engine  
Automates onboarding tasks and solution deployment.

MCP Integration Hub  
Provides AI capabilities for analysis and recommendations.

Synaptic System Modeler  
Visualizes recommended system architecture.

---

# Data Model

DiscoverySession
- id
- account_id
- status
- summary
- created_at

PainPoint
- id
- category
- severity
- confidence_score
- description

Capability
- id
- name
- domain
- dependencies

SolutionRecommendation
- id
- modules
- capabilities
- rationale
- expected_outcomes

TenantBlueprint
- id
- enabled_modules
- workflows
- templates
- dashboards

---

# Event Model

Core events:

DiscoveryStarted
PainPointDetected
CapabilityMatched
SolutionComposed
BlueprintGenerated
TenantBootstrapRequested
WorkspaceActivated

Example flow:

DiscoveryStarted → PainPointDetected → CapabilityMatched → SolutionComposed → BlueprintGenerated → WorkspaceActivated

---

# Example Scenario

Client input:

"Leads come through our website but nobody follows them up. Quotes are created manually and inventory does not match between store and online sales."

Pain Points Detected:

- lead leakage
- manual quoting
- inventory mismatch

Capabilities Suggested:

- lead_capture
- CRM_pipeline
- quote_generation
- inventory_sync
- POS_sync
- workflow_automation

Modules Suggested:

- CRM Builder
- Intelligent Sales Builder
- Inventory & Order Builder
- POS Builder
- Portal Builder
- Workflow Engine

Phased Implementation:

Phase 1  
CRM + Lead Capture

Phase 2  
Sales Builder + Quote Automation

Phase 3  
Inventory + POS Synchronization

---

# MVP Strategy

MVP 1
- intake wizard
- pain point taxonomy
- rule-based capability matching

MVP 2
- AI discovery assistant
- recommendation engine

MVP 3
- workspace bootstrap automation
- onboarding dashboards

---

# Outcome

The Solution Discovery Engine becomes the bridge between customer discovery and system orchestration inside the composable Business OS.


