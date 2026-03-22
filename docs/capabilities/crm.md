# Capability Spec: CRM

## Purpose

Manage leads, opportunities, customer-related activity, and the first stages of the commercial wedge.

## Role In MVP

CRM is the entry point of the wedge and one of the most mature implemented capabilities.

## Owns

- lead creation and listing
- lead qualification state
- lead conversion into opportunity
- opportunity lifecycle and stage changes
- related activity tracking

## Core Entities

- Lead
- Opportunity
- Activity
- Contact or customer linkage

## Exposed API Surface

The module currently appears to support:

- create lead
- list leads
- update lead
- convert lead
- create opportunity
- update opportunity
- change opportunity stage
- activity operations
- pipeline summary

## Dependencies

- `identity` for auth and workspace scoping
- shared persistence layer
- event backbone for business events

## Event Responsibilities

CRM should publish and maintain versioned contracts for events such as:

- lead captured
- lead converted to opportunity
- opportunity created
- opportunity updated
- opportunity stage changed
- opportunity won
- opportunity lost

## MVP Scope

- lead intake
- qualification
- opportunity progression
- handoff into downstream order and sales flow

## Current Gaps

- customer conversion boundary should be made explicit
- ownership line between CRM and Sales needs clearer documentation
- contract tests for CRM events and endpoints should be added

