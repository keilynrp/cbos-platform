# API Conventions Template

## Purpose

Use this template to define the MVP API conventions for all wedge-critical modules.

## Areas To Standardize

### Authentication

- how protected routes enforce auth
- how unauthorized responses behave
- how workspace scoping is applied

### Errors

- standard error shape
- validation error behavior
- not found behavior
- forbidden behavior

### Pagination

- default limit
- max limit
- offset or cursor strategy

### Identifiers

- ID format expectations
- path parameter naming

### Mutation Behavior

- create response expectations
- update response expectations
- delete response expectations

### Time Fields

- timestamp format
- timezone expectation

## Review Rule

After writing conventions, compare them against `identity`, `crm`, `sales`, `inventory`, and `workflows` and log any mismatch in `docs/IMPLEMENTATION_ALIGNMENT.md`.

