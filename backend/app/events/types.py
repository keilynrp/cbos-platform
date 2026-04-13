from pydantic import BaseModel, Field
from datetime import datetime, timezone
from typing import Any
import uuid


class Event(BaseModel):
    """Estructura canónica de evento del sistema."""

    event_id: str = Field(default_factory=lambda: str(uuid.uuid4()))
    event_type: str
    event_version: str = "1.0"
    timestamp: datetime = Field(default_factory=lambda: datetime.now(timezone.utc))
    source_module: str
    workspace_id: str
    actor_id: str | None = None
    entity_id: str | None = None
    payload: dict[str, Any] = {}


# ── Acquisition & Discovery ────────────────────────────────
LEAD_CAPTURED = "LeadCaptured"
DISCOVERY_SESSION_STARTED = "DiscoverySessionStarted"
DISCOVERY_SESSION_COMPLETED = "DiscoverySessionCompleted"
PAIN_POINT_DETECTED = "PainPointDetected"
CAPABILITY_MATCHED = "CapabilityMatched"
SOLUTION_COMPOSED = "SolutionComposed"
BLUEPRINT_GENERATED = "BlueprintGenerated"
WORKSPACE_ACTIVATED = "WorkspaceActivated"

# ── CRM & Revenue ──────────────────────────────────────────
OPPORTUNITY_CREATED = "OpportunityCreated"
OPPORTUNITY_UPDATED = "OpportunityUpdated"
OPPORTUNITY_STAGE_CHANGED = "OpportunityStageChanged"
OPPORTUNITY_WON = "OpportunityWon"
OPPORTUNITY_LOST = "OpportunityLost"
LEAD_CONVERTED_TO_OPPORTUNITY = "LeadConvertedToOpportunity"

# ── Sales & Commerce ───────────────────────────────────────
QUOTE_CREATED = "QuoteCreated"
QUOTE_SENT = "QuoteSent"
QUOTE_ACCEPTED = "QuoteAccepted"
QUOTE_REJECTED = "QuoteRejected"
SALES_ORDER_CREATED = "SalesOrderCreated"
SALES_ORDER_CONFIRMED = "SalesOrderConfirmed"
SALES_ORDER_IN_FULFILLMENT = "SalesOrderInFulfillment"
SALES_ORDER_FULFILLED = "SalesOrderFulfilled"
SALES_ORDER_CANCELLED = "SalesOrderCancelled"

# ── Inventory & Fulfillment ────────────────────────────────
INVENTORY_RESERVED = "InventoryReserved"
INVENTORY_RELEASED = "InventoryReleased"
STOCK_MOVEMENT_RECORDED = "StockMovementRecorded"
INVENTORY_LOW_THRESHOLD_DETECTED = "InventoryLowThresholdDetected"
FULFILLMENT_COMPLETED = "FulfillmentCompleted"

# ── Workflow ───────────────────────────────────────────────
WORKFLOW_TRIGGERED = "WorkflowTriggered"
WORKFLOW_COMPLETED = "WorkflowCompleted"
WORKFLOW_FAILED = "WorkflowFailed"

# ── Portal ─────────────────────────────────────────────────
PORTAL_SESSION_CREATED = "PortalSessionCreated"
PORTAL_SESSION_ACCESSED = "PortalSessionAccessed"
CUSTOMER_ACTION_PERFORMED = "CustomerActionPerformed"

# ── Accounting & Finance ───────────────────────────────────
INVOICE_CREATED = "InvoiceCreated"
INVOICE_SENT = "InvoiceSent"
INVOICE_PAID = "InvoicePaid"
INVOICE_OVERDUE = "InvoiceOverdue"
PAYMENT_RECORDED = "PaymentRecorded"

# ── Contracts ─────────────────────────────────────────────
CONTRACT_CREATED    = "ContractCreated"
CONTRACT_SENT       = "ContractSent"
CONTRACT_SIGNED     = "ContractSigned"
CONTRACT_EXECUTED   = "ContractExecuted"
CONTRACT_TERMINATED = "ContractTerminated"

# ── Projects ──────────────────────────────────────────────
PROJECT_CREATED        = "ProjectCreated"
PROJECT_ACTIVATED      = "ProjectActivated"
PROJECT_COMPLETED      = "ProjectCompleted"
PROJECT_CANCELLED      = "ProjectCancelled"
PROJECT_TASK_COMPLETED = "ProjectTaskCompleted"

# ── Platform ───────────────────────────────────────────────
USER_REGISTERED = "UserRegistered"
WORKSPACE_CREATED = "WorkspaceCreated"
USER_AUTHENTICATED = "UserAuthenticated"
MODULE_ACTIVATED = "ModuleActivated"
