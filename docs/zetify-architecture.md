# Zetify D2P2 System Architecture
**Email Triage POC - Comprehensive System Design**

Version: 1.0
Date: 2025-09-18

---

## Table of Contents
1. [System Overview](#system-overview)
2. [Microservices Architecture](#microservices-architecture)
3. [Database Schema Design](#database-schema-design)
4. [API Design](#api-design)
5. [Agent Framework Integration](#agent-framework-integration)
6. [Container Architecture](#container-architecture)
7. [Observability & Monitoring](#observability--monitoring)
8. [Deployment Topology](#deployment-topology)
9. [Component Diagrams](#component-diagrams)
10. [Data Flow Architecture](#data-flow-architecture)
11. [Integration Patterns](#integration-patterns)
12. [Security Architecture](#security-architecture)

---

## System Overview

### Architecture Principles
- **Event-Driven**: Asynchronous message processing
- **Microservices**: Loosely coupled, independently deployable services
- **Agent-Centric**: GenAI-native process execution
- **Resilient**: Self-healing with assurance layer
- **Observable**: Complete audit trail and monitoring

### High-Level Architecture

```mermaid
graph TB
    subgraph "External Systems"
        IMAP[IMAP/Exchange]
        CRM[CRM Systems]
        DEST[Target Mailboxes]
        SLACK[Slack/Teams]
    end

    subgraph "Ingestion Layer"
        MAIL_INGEST[Mail Ingestion Service]
        NORM[Normalization Service]
        OCR[OCR Service]
    end

    subgraph "Agent Runtime"
        ORCHESTRATOR[Agent Orchestrator]
        CLASS_AGENT[Classifier Agent]
        URG_AGENT[Urgency Agent]
        RET_AGENT[Retriever Agent]
        ROUTE_AGENT[Router Agent]
        CRIT_AGENT[Critique Agent]
        REF_AGENT[Refiner Agent]
        ESC_AGENT[Escalator Agent]
    end

    subgraph "Data Layer"
        NEO4J[(Neo4j Graph DB)]
        POSTGRES[(PostgreSQL)]
        REDIS[(Redis Cache)]
        VAULT[HashiCorp Vault]
    end

    subgraph "Processing Layer"
        ASSURANCE[Assurance Engine]
        CONTEXT[Context Enrichment]
        ROUTER[Email Router]
    end

    subgraph "Observability"
        PROMETHEUS[Prometheus]
        GRAFANA[Grafana]
        JAEGER[Jaeger Tracing]
        LOGS[Centralized Logging]
    end

    IMAP --> MAIL_INGEST
    MAIL_INGEST --> NORM
    NORM --> OCR
    OCR --> ORCHESTRATOR

    ORCHESTRATOR --> CLASS_AGENT
    ORCHESTRATOR --> URG_AGENT
    ORCHESTRATOR --> RET_AGENT
    ORCHESTRATOR --> ROUTE_AGENT
    ORCHESTRATOR --> CRIT_AGENT
    ORCHESTRATOR --> REF_AGENT
    ORCHESTRATOR --> ESC_AGENT

    CLASS_AGENT --> NEO4J
    URG_AGENT --> NEO4J
    RET_AGENT --> CRM
    RET_AGENT --> POSTGRES

    ORCHESTRATOR --> ASSURANCE
    ASSURANCE --> CONTEXT
    CONTEXT --> ROUTER

    ROUTER --> DEST
    ROUTER --> SLACK

    ALL_SERVICES --> PROMETHEUS
    ALL_SERVICES --> LOGS
```

---

## Microservices Architecture

### Service Boundaries & Responsibilities

#### 1. Email Ingestion Service
**Purpose**: IMAP/Exchange integration and email normalization

```yaml
service_name: email-ingestion
responsibilities:
  - IMAP/Graph API connectivity
  - Email parsing and MIME handling
  - Attachment extraction
  - Message deduplication
  - Rate limiting and retry logic

technologies:
  runtime: Node.js 18
  framework: Express.js
  libraries:
    - imap: Email protocol handling
    - mailparser: MIME parsing
    - multer: File handling

interfaces:
  rest:
    - POST /api/v1/emails/ingest
    - GET /api/v1/emails/status/{id}

  events:
    publishes:
      - email.received
      - email.parsed
      - email.failed

    subscribes:
      - email.retry

resources:
  cpu: "500m"
  memory: "512Mi"
  storage: "10Gi"

scaling:
  min_replicas: 2
  max_replicas: 10
  target_cpu: 70%
```

#### 2. Normalization Service
**Purpose**: Content processing and PII masking

```yaml
service_name: normalization
responsibilities:
  - HTML to plain text conversion
  - PII detection and masking
  - Content sanitization
  - Language detection
  - Attachment OCR coordination

technologies:
  runtime: Python 3.11
  framework: FastAPI
  libraries:
    - spacy: NLP processing
    - presidio: PII detection
    - beautifulsoup4: HTML parsing
    - tesseract: OCR integration

interfaces:
  rest:
    - POST /api/v1/normalize
    - GET /api/v1/normalize/status/{id}

  events:
    publishes:
      - email.normalized
      - email.pii_detected

    subscribes:
      - email.parsed

resources:
  cpu: "1000m"
  memory: "1Gi"
  storage: "5Gi"
```

#### 3. Agent Orchestrator Service
**Purpose**: Agent lifecycle and workflow management

```yaml
service_name: agent-orchestrator
responsibilities:
  - Agent spawning and coordination
  - Workflow state management
  - Resource allocation
  - Failure recovery
  - Performance monitoring

technologies:
  runtime: Python 3.11
  framework: FastAPI
  libraries:
    - langgraph: Agent orchestration
    - celery: Task queue
    - redis: State management

interfaces:
  rest:
    - POST /api/v1/workflows/execute
    - GET /api/v1/workflows/{id}/status
    - POST /api/v1/agents/spawn

  events:
    publishes:
      - workflow.started
      - workflow.completed
      - agent.spawned

    subscribes:
      - email.normalized
      - agent.completed

resources:
  cpu: "2000m"
  memory: "2Gi"
  storage: "1Gi"
```

#### 4. Context Enrichment Service
**Purpose**: External data integration and context building

```yaml
service_name: context-enrichment
responsibilities:
  - CRM data retrieval
  - Historical ticket lookup
  - Account information enrichment
  - Contact verification
  - Previous interaction analysis

technologies:
  runtime: Node.js 18
  framework: Express.js
  libraries:
    - axios: HTTP client
    - node-cache: Local caching
    - joi: Data validation

interfaces:
  rest:
    - POST /api/v1/context/enrich
    - GET /api/v1/context/account/{email}

  external:
    - Salesforce API
    - HubSpot API
    - Zendesk API

  events:
    publishes:
      - context.enriched
      - context.failed

    subscribes:
      - agent.context_requested

resources:
  cpu: "500m"
  memory: "512Mi"
  storage: "2Gi"
```

#### 5. Assurance Engine Service
**Purpose**: Quality assurance and confidence scoring

```yaml
service_name: assurance-engine
responsibilities:
  - Confidence scoring
  - Policy validation
  - Ambiguity detection
  - Retry orchestration
  - Escalation decisions

technologies:
  runtime: Python 3.11
  framework: FastAPI
  libraries:
    - scikit-learn: ML scoring
    - numpy: Mathematical operations
    - pydantic: Data validation

interfaces:
  rest:
    - POST /api/v1/assurance/evaluate
    - GET /api/v1/assurance/metrics

  events:
    publishes:
      - assurance.passed
      - assurance.retry_required
      - assurance.escalate

    subscribes:
      - agent.output_ready

resources:
  cpu: "1000m"
  memory: "1Gi"
  storage: "1Gi"
```

#### 6. Email Router Service
**Purpose**: Final routing and delivery

```yaml
service_name: email-router
responsibilities:
  - Destination determination
  - Context note generation
  - Email forwarding
  - Delivery confirmation
  - Failure handling

technologies:
  runtime: Node.js 18
  framework: Express.js
  libraries:
    - nodemailer: Email sending
    - handlebars: Template engine
    - amqplib: Message queue

interfaces:
  rest:
    - POST /api/v1/route/email
    - GET /api/v1/route/status/{id}

  external:
    - SMTP servers
    - Slack API
    - Teams API

  events:
    publishes:
      - email.routed
      - email.delivered
      - email.failed

    subscribes:
      - assurance.passed

resources:
  cpu: "500m"
  memory: "512Mi"
  storage: "1Gi"
```

---

## Database Schema Design

### Neo4j Graph Ontology

#### Node Types & Properties

```cypher
// Email Node
CREATE CONSTRAINT email_id FOR (e:Email) REQUIRE e.id IS UNIQUE;
(:Email {
  id: "uuid",
  from: "string",
  subject: "string",
  body_text: "string",
  timestamp: "datetime",
  message_id: "string",
  thread_id: "string",
  language: "string",
  word_count: "integer",
  has_attachments: "boolean",
  pii_masked: "boolean"
})

// Intent Node
CREATE CONSTRAINT intent_name FOR (i:Intent) REQUIRE i.name IS UNIQUE;
(:Intent {
  name: "support|sales|bd|hr|pr|legal|finance|spam|other",
  description: "string",
  keywords: ["string"],
  patterns: ["string"],
  confidence_threshold: "float",
  active: "boolean"
})

// Department Node
CREATE CONSTRAINT dept_name FOR (d:Department) REQUIRE d.name IS UNIQUE;
(:Department {
  name: "support|sales|bd|hr|pr|legal|finance|ops",
  email_address: "string",
  slack_channel: "string",
  sla_hours: "integer",
  escalation_email: "string",
  active: "boolean"
})

// Agent Node
CREATE CONSTRAINT agent_id FOR (a:Agent) REQUIRE a.id IS UNIQUE;
(:Agent {
  id: "uuid",
  type: "classifier|urgency|retriever|router|critique|refiner|escalator",
  version: "string",
  model: "string",
  prompt_template: "string",
  created_at: "datetime",
  performance_score: "float"
})

// Classification Node
(:Classification {
  id: "uuid",
  intent: "string",
  confidence: "float",
  reasoning: "string",
  secondary_intents: ["string"],
  timestamp: "datetime",
  agent_version: "string"
})

// Context Node
(:Context {
  id: "uuid",
  account_info: "json",
  previous_tickets: "json",
  relationship_score: "float",
  escalation_history: "json",
  enriched_at: "datetime"
})

// Workflow Node
(:Workflow {
  id: "uuid",
  status: "running|completed|failed|escalated",
  started_at: "datetime",
  completed_at: "datetime",
  total_agents: "integer",
  successful_agents: "integer",
  final_confidence: "float"
})
```

#### Relationship Types

```cypher
// Email relationships
(:Email)-[:CLASSIFIED_AS]->(:Intent)
(:Email)-[:ASSIGNED_TO]->(:Department)
(:Email)-[:PROCESSED_BY]->(:Workflow)
(:Email)-[:HAS_CONTEXT]->(:Context)
(:Email)-[:PART_OF_THREAD]->(:Email)

// Agent relationships
(:Agent)-[:PERFORMED]->(:Classification)
(:Agent)-[:SUCCEEDED_BY]->(:Agent)
(:Workflow)-[:EXECUTED_BY]->(:Agent)

// Business relationships
(:Intent)-[:ROUTES_TO]->(:Department)
(:Department)-[:ESCALATES_TO]->(:Department)
(:Agent)-[:SPECIALIZES_IN]->(:Intent)

// Feedback relationships
(:Classification)-[:VALIDATED_BY]->(:Agent)
(:Workflow)-[:REVIEWED_BY]->(:Agent)
```

### PostgreSQL Schema

#### Audit and Operational Tables

```sql
-- Audit Log Table (partitioned by date)
CREATE TABLE audit_logs (
    id BIGSERIAL PRIMARY KEY,
    email_id UUID NOT NULL,
    workflow_id UUID NOT NULL,
    agent_type VARCHAR(50) NOT NULL,
    action VARCHAR(100) NOT NULL,
    input_data JSONB,
    output_data JSONB,
    confidence_score FLOAT,
    processing_time_ms INTEGER,
    model_used VARCHAR(100),
    prompt_tokens INTEGER,
    completion_tokens INTEGER,
    total_cost_usd DECIMAL(10,6),
    error_message TEXT,
    timestamp TIMESTAMP DEFAULT CURRENT_TIMESTAMP,

    INDEX idx_email_id (email_id),
    INDEX idx_workflow_id (workflow_id),
    INDEX idx_timestamp (timestamp),
    INDEX idx_agent_type (agent_type)
) PARTITION BY RANGE (timestamp);

-- Create monthly partitions
CREATE TABLE audit_logs_2024_09 PARTITION OF audit_logs
    FOR VALUES FROM ('2024-09-01') TO ('2024-10-01');

-- Email Processing State
CREATE TABLE email_states (
    email_id UUID PRIMARY KEY,
    current_state VARCHAR(50) NOT NULL,
    workflow_id UUID,
    retry_count INTEGER DEFAULT 0,
    escalation_reason TEXT,
    last_processed_at TIMESTAMP,
    final_routing JSONB,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Performance Metrics
CREATE TABLE agent_metrics (
    id BIGSERIAL PRIMARY KEY,
    agent_type VARCHAR(50) NOT NULL,
    date DATE NOT NULL,
    total_executions INTEGER DEFAULT 0,
    successful_executions INTEGER DEFAULT 0,
    average_confidence FLOAT DEFAULT 0,
    average_processing_time_ms INTEGER DEFAULT 0,
    total_cost_usd DECIMAL(10,4) DEFAULT 0,

    UNIQUE(agent_type, date)
);

-- Configuration Management
CREATE TABLE system_config (
    key VARCHAR(100) PRIMARY KEY,
    value JSONB NOT NULL,
    description TEXT,
    updated_by VARCHAR(100),
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- External System Integration
CREATE TABLE external_integrations (
    id SERIAL PRIMARY KEY,
    system_name VARCHAR(100) NOT NULL,
    endpoint_url VARCHAR(500),
    auth_config JSONB,
    rate_limit_per_minute INTEGER,
    timeout_seconds INTEGER,
    active BOOLEAN DEFAULT true,
    last_health_check TIMESTAMP,
    health_status VARCHAR(20)
);
```

---

## API Design

### REST API Specification

```yaml
openapi: 3.0.0
info:
  title: Zetify D2P2 Email Triage API
  version: 1.0.0
  description: Email triage system with agentic processing

servers:
  - url: https://api.zetify-d2p2.local/v1
    description: Local deployment
  - url: https://api.zetify-d2p2.dev/v1
    description: Development environment

components:
  securitySchemes:
    bearerAuth:
      type: http
      scheme: bearer
      bearerFormat: JWT

    apiKey:
      type: apiKey
      in: header
      name: X-API-Key

  schemas:
    Email:
      type: object
      required: [from, subject, body]
      properties:
        id:
          type: string
          format: uuid
        from:
          type: string
          format: email
        subject:
          type: string
          maxLength: 500
        body:
          type: string
        attachments:
          type: array
          items:
            $ref: '#/components/schemas/Attachment'
        headers:
          type: object
          additionalProperties: true

    Classification:
      type: object
      properties:
        intent:
          type: string
          enum: [support, sales, bd, hr, pr, legal, finance, spam, other]
        department:
          type: string
          enum: [support, sales, bd, hr, pr, legal, finance, ops]
        confidence:
          type: number
          minimum: 0
          maximum: 1
        urgency:
          type: string
          enum: [low, normal, high, critical]
        reasoning:
          type: string
        signals:
          type: object
          properties:
            is_deadline:
              type: boolean
            is_legal_risk:
              type: boolean
            is_hr_sensitive:
              type: boolean

    Workflow:
      type: object
      properties:
        id:
          type: string
          format: uuid
        email_id:
          type: string
          format: uuid
        status:
          type: string
          enum: [queued, running, completed, failed, escalated]
        agents_executed:
          type: array
          items:
            type: string
        current_agent:
          type: string
        confidence_score:
          type: number
        started_at:
          type: string
          format: date-time
        completed_at:
          type: string
          format: date-time

    ContextEnrichment:
      type: object
      properties:
        account_info:
          type: object
          properties:
            customer_id:
              type: string
            tier:
              type: string
            contract_value:
              type: number
        previous_interactions:
          type: array
          items:
            type: object
        escalation_history:
          type: array
          items:
            type: object

paths:
  /emails/ingest:
    post:
      summary: Ingest new email for processing
      security:
        - bearerAuth: []
      requestBody:
        required: true
        content:
          application/json:
            schema:
              $ref: '#/components/schemas/Email'
      responses:
        201:
          description: Email accepted for processing
          content:
            application/json:
              schema:
                type: object
                properties:
                  email_id:
                    type: string
                    format: uuid
                  workflow_id:
                    type: string
                    format: uuid
                  status:
                    type: string
                    enum: [queued]
        400:
          description: Invalid email format
        429:
          description: Rate limit exceeded

  /workflows/{workflow_id}/status:
    get:
      summary: Get workflow processing status
      security:
        - bearerAuth: []
      parameters:
        - name: workflow_id
          in: path
          required: true
          schema:
            type: string
            format: uuid
      responses:
        200:
          description: Workflow status
          content:
            application/json:
              schema:
                $ref: '#/components/schemas/Workflow'
        404:
          description: Workflow not found

  /agents/spawn:
    post:
      summary: Spawn new agent instance
      security:
        - bearerAuth: []
      requestBody:
        required: true
        content:
          application/json:
            schema:
              type: object
              properties:
                agent_type:
                  type: string
                  enum: [classifier, urgency, retriever, router, critique, refiner, escalator]
                model:
                  type: string
                config:
                  type: object
      responses:
        201:
          description: Agent spawned successfully
        400:
          description: Invalid agent configuration

  /context/enrich:
    post:
      summary: Enrich email with context data
      security:
        - bearerAuth: []
      requestBody:
        required: true
        content:
          application/json:
            schema:
              type: object
              properties:
                email_id:
                  type: string
                  format: uuid
                sender_email:
                  type: string
                  format: email
      responses:
        200:
          description: Context enrichment completed
          content:
            application/json:
              schema:
                $ref: '#/components/schemas/ContextEnrichment'

  /metrics/dashboard:
    get:
      summary: Get system metrics for monitoring
      security:
        - bearerAuth: []
      parameters:
        - name: timeframe
          in: query
          schema:
            type: string
            enum: [1h, 24h, 7d, 30d]
            default: 24h
      responses:
        200:
          description: System metrics
          content:
            application/json:
              schema:
                type: object
                properties:
                  total_emails_processed:
                    type: integer
                  classification_accuracy:
                    type: number
                  average_processing_time:
                    type: number
                  escalation_rate:
                    type: number
                  agent_performance:
                    type: object
```

### Webhook Specifications

```yaml
webhooks:
  email_processed:
    post:
      summary: Email processing completed
      requestBody:
        content:
          application/json:
            schema:
              type: object
              properties:
                event_type:
                  type: string
                  enum: [email.processed, email.escalated, email.failed]
                email_id:
                  type: string
                workflow_id:
                  type: string
                classification:
                  $ref: '#/components/schemas/Classification'
                routing_decision:
                  type: object
                  properties:
                    target_department:
                      type: string
                    target_email:
                      type: string
                    context_note:
                      type: string
                timestamp:
                  type: string
                  format: date-time
      responses:
        200:
          description: Webhook received successfully

  agent_feedback:
    post:
      summary: Agent performance feedback
      requestBody:
        content:
          application/json:
            schema:
              type: object
              properties:
                agent_type:
                  type: string
                workflow_id:
                  type: string
                performance_score:
                  type: number
                feedback:
                  type: string
                suggested_improvements:
                  type: array
                  items:
                    type: string
      responses:
        200:
          description: Feedback recorded
```

---

## Agent Framework Integration

### LangGraph Integration Architecture

```python
# Agent Workflow Definition
from langgraph.graph import StateGraph, END
from langgraph.prebuilt import ToolInvocation
from typing import TypedDict, Annotated
import operator

class EmailTriageState(TypedDict):
    email_content: str
    email_metadata: dict
    classification_result: dict
    urgency_result: dict
    context_data: dict
    routing_decision: dict
    confidence_scores: dict
    retry_count: int
    escalation_required: bool
    final_output: dict

# Agent Node Definitions
def classifier_agent(state: EmailTriageState) -> EmailTriageState:
    """Classify email intent and department"""
    classification = classify_email(
        content=state["email_content"],
        metadata=state["email_metadata"]
    )
    return {
        **state,
        "classification_result": classification,
        "confidence_scores": {
            **state.get("confidence_scores", {}),
            "classification": classification["confidence"]
        }
    }

def urgency_agent(state: EmailTriageState) -> EmailTriageState:
    """Determine email urgency level"""
    urgency = assess_urgency(
        content=state["email_content"],
        classification=state["classification_result"]
    )
    return {
        **state,
        "urgency_result": urgency,
        "confidence_scores": {
            **state.get("confidence_scores", {}),
            "urgency": urgency["confidence"]
        }
    }

def retriever_agent(state: EmailTriageState) -> EmailTriageState:
    """Retrieve context from external systems"""
    context = retrieve_context(
        sender_email=state["email_metadata"]["from"],
        subject=state["email_metadata"]["subject"]
    )
    return {
        **state,
        "context_data": context
    }

def router_agent(state: EmailTriageState) -> EmailTriageState:
    """Make final routing decision"""
    routing = route_email(
        classification=state["classification_result"],
        urgency=state["urgency_result"],
        context=state["context_data"]
    )
    return {
        **state,
        "routing_decision": routing,
        "confidence_scores": {
            **state.get("confidence_scores", {}),
            "routing": routing["confidence"]
        }
    }

def critique_agent(state: EmailTriageState) -> EmailTriageState:
    """Validate and critique the routing decision"""
    critique = critique_decision(
        classification=state["classification_result"],
        routing=state["routing_decision"],
        context=state["context_data"]
    )

    overall_confidence = calculate_overall_confidence(
        state["confidence_scores"]
    )

    return {
        **state,
        "confidence_scores": {
            **state["confidence_scores"],
            "overall": overall_confidence,
            "critique": critique["confidence"]
        },
        "escalation_required": overall_confidence < 0.65
    }

def should_escalate(state: EmailTriageState) -> str:
    """Routing logic for escalation"""
    if state["escalation_required"]:
        return "escalate"
    else:
        return "complete"

def escalator_agent(state: EmailTriageState) -> EmailTriageState:
    """Prepare escalation packet for human review"""
    escalation_packet = prepare_escalation(
        email_content=state["email_content"],
        analysis_results=state,
        confidence_scores=state["confidence_scores"]
    )

    return {
        **state,
        "final_output": escalation_packet,
        "escalation_required": True
    }

def complete_workflow(state: EmailTriageState) -> EmailTriageState:
    """Complete successful processing"""
    final_output = {
        "classification": state["classification_result"],
        "urgency": state["urgency_result"],
        "routing": state["routing_decision"],
        "context_note": generate_context_note(state),
        "confidence": state["confidence_scores"]["overall"]
    }

    return {
        **state,
        "final_output": final_output
    }

# Build the workflow graph
workflow = StateGraph(EmailTriageState)

# Add nodes
workflow.add_node("classify", classifier_agent)
workflow.add_node("assess_urgency", urgency_agent)
workflow.add_node("retrieve_context", retriever_agent)
workflow.add_node("route", router_agent)
workflow.add_node("critique", critique_agent)
workflow.add_node("escalate", escalator_agent)
workflow.add_node("complete", complete_workflow)

# Add edges
workflow.add_edge("classify", "assess_urgency")
workflow.add_edge("assess_urgency", "retrieve_context")
workflow.add_edge("retrieve_context", "route")
workflow.add_edge("route", "critique")

# Conditional routing
workflow.add_conditional_edges(
    "critique",
    should_escalate,
    {
        "escalate": "escalate",
        "complete": "complete"
    }
)

workflow.add_edge("escalate", END)
workflow.add_edge("complete", END)

# Set entry point
workflow.set_entry_point("classify")

# Compile the graph
app = workflow.compile()
```

### CrewAI Integration Alternative

```python
# CrewAI Agent Definitions
from crewai import Agent, Task, Crew, Process

# Define Agents
classifier_agent = Agent(
    role='Email Classifier',
    goal='Accurately classify email intent and assign to correct department',
    backstory="""You are an expert email classifier with deep understanding
    of business communication patterns. You can identify the intent behind
    emails and route them to the appropriate department.""",
    tools=[intent_classification_tool, department_mapping_tool],
    verbose=True,
    allow_delegation=False,
    max_iter=3
)

urgency_agent = Agent(
    role='Urgency Assessor',
    goal='Determine the urgency level of incoming emails',
    backstory="""You specialize in identifying time-sensitive communications
    and can detect deadlines, escalations, and critical business matters.""",
    tools=[urgency_detection_tool, deadline_parser_tool],
    verbose=True,
    allow_delegation=False
)

context_agent = Agent(
    role='Context Retriever',
    goal='Enrich emails with relevant business context',
    backstory="""You have access to all company systems and can quickly
    gather relevant context about customers, previous interactions, and
    account status.""",
    tools=[crm_lookup_tool, ticket_history_tool, account_info_tool],
    verbose=True,
    allow_delegation=False
)

router_agent = Agent(
    role='Email Router',
    goal='Make final routing decisions with context notes',
    backstory="""You are the final decision maker who combines all analysis
    to route emails effectively and create helpful context notes.""",
    tools=[routing_logic_tool, context_note_generator],
    verbose=True,
    allow_delegation=False
)

# Define Tasks
classification_task = Task(
    description="""Analyze the email content and classify it:
    1. Determine the primary intent (support, sales, hr, etc.)
    2. Identify the target department
    3. Extract key signals (deadline, legal risk, etc.)
    4. Provide confidence score and reasoning

    Email content: {email_content}
    Email metadata: {email_metadata}""",
    agent=classifier_agent,
    expected_output="Classification result with intent, department, confidence, and reasoning"
)

urgency_task = Task(
    description="""Assess the urgency of this email:
    1. Look for time-sensitive language
    2. Identify deadlines or critical issues
    3. Consider sender importance
    4. Assign urgency level (low, normal, high, critical)

    Use the classification result: {classification_result}""",
    agent=urgency_agent,
    expected_output="Urgency assessment with level, reasoning, and deadline info",
    context=[classification_task]
)

context_task = Task(
    description="""Gather relevant context for this email:
    1. Look up sender in CRM systems
    2. Find previous ticket history
    3. Check account status and tier
    4. Identify relationship history

    Sender: {sender_email}
    Subject: {email_subject}""",
    agent=context_agent,
    expected_output="Context data including CRM info, ticket history, and account details",
    context=[classification_task]
)

routing_task = Task(
    description="""Make the final routing decision:
    1. Combine classification, urgency, and context
    2. Determine final destination
    3. Generate helpful context note
    4. Calculate overall confidence

    Use all previous analysis results.""",
    agent=router_agent,
    expected_output="Final routing decision with destination, context note, and confidence",
    context=[classification_task, urgency_task, context_task]
)

# Create Crew
email_triage_crew = Crew(
    agents=[classifier_agent, urgency_agent, context_agent, router_agent],
    tasks=[classification_task, urgency_task, context_task, routing_task],
    process=Process.sequential,
    verbose=2,
    memory=True,
    embedder={
        "provider": "openai",
        "config": {
            "model": "text-embedding-3-small"
        }
    }
)
```

---

## Container Architecture

### Docker Compose Structure

```yaml
# docker-compose.yml
version: '3.8'

services:
  # API Gateway
  nginx:
    image: nginx:alpine
    ports:
      - "80:80"
      - "443:443"
    volumes:
      - ./nginx/nginx.conf:/etc/nginx/nginx.conf
      - ./ssl:/etc/ssl
    depends_on:
      - email-ingestion
      - agent-orchestrator
    networks:
      - zetify-network
    restart: unless-stopped

  # Core Services
  email-ingestion:
    build:
      context: ./services/email-ingestion
      dockerfile: Dockerfile
    environment:
      - NODE_ENV=production
      - IMAP_HOST=${IMAP_HOST}
      - IMAP_USER=${IMAP_USER}
      - IMAP_PASS=${IMAP_PASS}
      - REDIS_URL=redis://redis:6379
      - NEO4J_URI=bolt://neo4j:7687
    volumes:
      - ./logs/email-ingestion:/app/logs
      - ./data/attachments:/app/attachments
    depends_on:
      - redis
      - neo4j
    networks:
      - zetify-network
    restart: unless-stopped
    healthcheck:
      test: ["CMD", "curl", "-f", "http://localhost:3000/health"]
      interval: 30s
      timeout: 10s
      retries: 3

  normalization:
    build:
      context: ./services/normalization
      dockerfile: Dockerfile
    environment:
      - PYTHON_ENV=production
      - REDIS_URL=redis://redis:6379
      - OCR_ENDPOINT=http://ocr-service:8080
      - PII_DETECTION_MODEL=en_core_web_sm
    volumes:
      - ./logs/normalization:/app/logs
      - ./data/processed:/app/processed
    depends_on:
      - redis
      - ocr-service
    networks:
      - zetify-network
    restart: unless-stopped

  agent-orchestrator:
    build:
      context: ./services/agent-orchestrator
      dockerfile: Dockerfile
    environment:
      - PYTHON_ENV=production
      - OPENAI_API_KEY=${OPENAI_API_KEY}
      - ANTHROPIC_API_KEY=${ANTHROPIC_API_KEY}
      - REDIS_URL=redis://redis:6379
      - NEO4J_URI=bolt://neo4j:7687
      - POSTGRES_URL=${POSTGRES_URL}
    volumes:
      - ./logs/orchestrator:/app/logs
      - ./config/agents:/app/config
    depends_on:
      - redis
      - neo4j
      - postgres
    networks:
      - zetify-network
    restart: unless-stopped
    deploy:
      resources:
        limits:
          memory: 2G
          cpus: '2.0'

  context-enrichment:
    build:
      context: ./services/context-enrichment
      dockerfile: Dockerfile
    environment:
      - NODE_ENV=production
      - SALESFORCE_CLIENT_ID=${SALESFORCE_CLIENT_ID}
      - SALESFORCE_CLIENT_SECRET=${SALESFORCE_CLIENT_SECRET}
      - HUBSPOT_API_KEY=${HUBSPOT_API_KEY}
      - ZENDESK_API_TOKEN=${ZENDESK_API_TOKEN}
      - REDIS_URL=redis://redis:6379
    volumes:
      - ./logs/context:/app/logs
    depends_on:
      - redis
    networks:
      - zetify-network
    restart: unless-stopped

  assurance-engine:
    build:
      context: ./services/assurance-engine
      dockerfile: Dockerfile
    environment:
      - PYTHON_ENV=production
      - CONFIDENCE_THRESHOLD=0.65
      - REDIS_URL=redis://redis:6379
      - POSTGRES_URL=${POSTGRES_URL}
    volumes:
      - ./logs/assurance:/app/logs
      - ./models:/app/models
    depends_on:
      - redis
      - postgres
    networks:
      - zetify-network
    restart: unless-stopped

  email-router:
    build:
      context: ./services/email-router
      dockerfile: Dockerfile
    environment:
      - NODE_ENV=production
      - SMTP_HOST=${SMTP_HOST}
      - SMTP_USER=${SMTP_USER}
      - SMTP_PASS=${SMTP_PASS}
      - SLACK_WEBHOOK_URL=${SLACK_WEBHOOK_URL}
      - TEAMS_WEBHOOK_URL=${TEAMS_WEBHOOK_URL}
    volumes:
      - ./logs/router:/app/logs
      - ./templates:/app/templates
    networks:
      - zetify-network
    restart: unless-stopped

  # Supporting Services
  ocr-service:
    image: tesseractshadow/tesseract4re:latest
    environment:
      - TESSDATA_PREFIX=/usr/share/tesseract-ocr/4.00/tessdata
    volumes:
      - ./data/attachments:/app/input
      - ./data/ocr-output:/app/output
    networks:
      - zetify-network
    restart: unless-stopped

  # Data Layer
  neo4j:
    image: neo4j:5.13-community
    environment:
      - NEO4J_AUTH=neo4j/${NEO4J_PASSWORD}
      - NEO4J_PLUGINS=["apoc"]
      - NEO4J_dbms_security_procedures_unrestricted=apoc.*
    ports:
      - "7474:7474"
      - "7687:7687"
    volumes:
      - neo4j_data:/data
      - neo4j_logs:/logs
      - ./neo4j/plugins:/plugins
    networks:
      - zetify-network
    restart: unless-stopped

  postgres:
    image: postgres:15-alpine
    environment:
      - POSTGRES_DB=zetify_d2p2
      - POSTGRES_USER=${POSTGRES_USER}
      - POSTGRES_PASSWORD=${POSTGRES_PASSWORD}
    ports:
      - "5432:5432"
    volumes:
      - postgres_data:/var/lib/postgresql/data
      - ./postgres/init:/docker-entrypoint-initdb.d
    networks:
      - zetify-network
    restart: unless-stopped

  redis:
    image: redis:7-alpine
    command: redis-server --appendonly yes --maxmemory 512mb --maxmemory-policy allkeys-lru
    ports:
      - "6379:6379"
    volumes:
      - redis_data:/data
    networks:
      - zetify-network
    restart: unless-stopped

  # Message Queue
  rabbitmq:
    image: rabbitmq:3-management-alpine
    environment:
      - RABBITMQ_DEFAULT_USER=${RABBITMQ_USER}
      - RABBITMQ_DEFAULT_PASS=${RABBITMQ_PASS}
    ports:
      - "5672:5672"
      - "15672:15672"
    volumes:
      - rabbitmq_data:/var/lib/rabbitmq
    networks:
      - zetify-network
    restart: unless-stopped

  # Security
  vault:
    image: vault:1.15
    cap_add:
      - IPC_LOCK
    environment:
      - VAULT_DEV_ROOT_TOKEN_ID=${VAULT_ROOT_TOKEN}
      - VAULT_DEV_LISTEN_ADDRESS=0.0.0.0:8200
    ports:
      - "8200:8200"
    volumes:
      - vault_data:/vault/data
      - ./vault/config:/vault/config
    networks:
      - zetify-network
    restart: unless-stopped

  # Observability
  prometheus:
    image: prom/prometheus:latest
    ports:
      - "9090:9090"
    volumes:
      - ./prometheus/prometheus.yml:/etc/prometheus/prometheus.yml
      - prometheus_data:/prometheus
    command:
      - '--config.file=/etc/prometheus/prometheus.yml'
      - '--storage.tsdb.path=/prometheus'
      - '--web.console.libraries=/etc/prometheus/console_libraries'
      - '--web.console.templates=/etc/prometheus/consoles'
    networks:
      - zetify-network
    restart: unless-stopped

  grafana:
    image: grafana/grafana:latest
    ports:
      - "3000:3000"
    environment:
      - GF_SECURITY_ADMIN_PASSWORD=${GRAFANA_PASSWORD}
    volumes:
      - grafana_data:/var/lib/grafana
      - ./grafana/dashboards:/etc/grafana/provisioning/dashboards
      - ./grafana/datasources:/etc/grafana/provisioning/datasources
    networks:
      - zetify-network
    restart: unless-stopped

  jaeger:
    image: jaegertracing/all-in-one:latest
    ports:
      - "16686:16686"
      - "14268:14268"
    environment:
      - COLLECTOR_OTLP_ENABLED=true
    networks:
      - zetify-network
    restart: unless-stopped

networks:
  zetify-network:
    driver: bridge

volumes:
  neo4j_data:
  neo4j_logs:
  postgres_data:
  redis_data:
  rabbitmq_data:
  vault_data:
  prometheus_data:
  grafana_data:
```

### Individual Service Dockerfiles

```dockerfile
# services/email-ingestion/Dockerfile
FROM node:18-alpine

WORKDIR /app

# Install system dependencies
RUN apk add --no-cache \
    python3 \
    make \
    g++ \
    curl

# Copy package files
COPY package*.json ./

# Install dependencies
RUN npm ci --only=production

# Copy source code
COPY . .

# Create non-root user
RUN addgroup -g 1001 -S nodejs
RUN adduser -S nodejs -u 1001

# Create required directories
RUN mkdir -p /app/logs /app/attachments
RUN chown -R nodejs:nodejs /app

USER nodejs

EXPOSE 3000

HEALTHCHECK --interval=30s --timeout=3s --start-period=5s --retries=3 \
  CMD curl -f http://localhost:3000/health || exit 1

CMD ["npm", "start"]
```

```dockerfile
# services/agent-orchestrator/Dockerfile
FROM python:3.11-slim

WORKDIR /app

# Install system dependencies
RUN apt-get update && apt-get install -y \
    curl \
    gcc \
    g++ \
    && rm -rf /var/lib/apt/lists/*

# Copy requirements first for better caching
COPY requirements.txt .

# Install Python dependencies
RUN pip install --no-cache-dir -r requirements.txt

# Copy source code
COPY . .

# Create non-root user
RUN groupadd -r appuser && useradd -r -g appuser appuser
RUN mkdir -p /app/logs /app/config && chown -R appuser:appuser /app

USER appuser

EXPOSE 8000

HEALTHCHECK --interval=30s --timeout=10s --start-period=30s --retries=3 \
  CMD curl -f http://localhost:8000/health || exit 1

CMD ["uvicorn", "main:app", "--host", "0.0.0.0", "--port", "8000"]
```

---

## Observability & Monitoring

### Prometheus Configuration

```yaml
# prometheus/prometheus.yml
global:
  scrape_interval: 15s
  evaluation_interval: 15s

rule_files:
  - "rules/*.yml"

alerting:
  alertmanagers:
    - static_configs:
        - targets:
          - alertmanager:9093

scrape_configs:
  - job_name: 'prometheus'
    static_configs:
      - targets: ['localhost:9090']

  - job_name: 'email-ingestion'
    static_configs:
      - targets: ['email-ingestion:3000']
    metrics_path: '/metrics'
    scrape_interval: 10s

  - job_name: 'agent-orchestrator'
    static_configs:
      - targets: ['agent-orchestrator:8000']
    metrics_path: '/metrics'
    scrape_interval: 10s

  - job_name: 'neo4j'
    static_configs:
      - targets: ['neo4j:2004']
    metrics_path: '/metrics'

  - job_name: 'postgres'
    static_configs:
      - targets: ['postgres-exporter:9187']

  - job_name: 'redis'
    static_configs:
      - targets: ['redis-exporter:9121']

  - job_name: 'rabbitmq'
    static_configs:
      - targets: ['rabbitmq:15692']
```

### Custom Metrics for Email Triage

```python
# metrics/email_triage_metrics.py
from prometheus_client import Counter, Histogram, Gauge, Summary

# Email processing metrics
emails_processed_total = Counter(
    'emails_processed_total',
    'Total number of emails processed',
    ['status', 'intent', 'department']
)

email_processing_duration = Histogram(
    'email_processing_duration_seconds',
    'Time spent processing emails',
    ['agent_type'],
    buckets=[0.1, 0.5, 1.0, 2.5, 5.0, 10.0, 30.0, 60.0]
)

# Agent performance metrics
agent_execution_total = Counter(
    'agent_execution_total',
    'Total agent executions',
    ['agent_type', 'status']
)

agent_confidence_score = Histogram(
    'agent_confidence_score',
    'Confidence scores from agents',
    ['agent_type'],
    buckets=[0.0, 0.1, 0.2, 0.3, 0.4, 0.5, 0.6, 0.7, 0.8, 0.9, 1.0]
)

# Workflow metrics
workflow_active_count = Gauge(
    'workflow_active_count',
    'Number of active workflows'
)

escalation_rate = Gauge(
    'escalation_rate',
    'Percentage of emails requiring escalation'
)

# Business metrics
classification_accuracy = Gauge(
    'classification_accuracy',
    'Email classification accuracy percentage'
)

sla_compliance = Gauge(
    'sla_compliance',
    'SLA compliance percentage',
    ['urgency_level']
)

# External system metrics
external_api_calls = Counter(
    'external_api_calls_total',
    'Total external API calls',
    ['system', 'status']
)

external_api_duration = Summary(
    'external_api_duration_seconds',
    'External API call duration',
    ['system']
)
```

### Grafana Dashboard Configuration

```json
{
  "dashboard": {
    "id": null,
    "title": "Zetify D2P2 Email Triage Dashboard",
    "tags": ["zetify", "email-triage"],
    "timezone": "browser",
    "panels": [
      {
        "id": 1,
        "title": "Email Processing Rate",
        "type": "stat",
        "targets": [
          {
            "expr": "rate(emails_processed_total[5m])",
            "legendFormat": "Emails/sec"
          }
        ],
        "fieldConfig": {
          "defaults": {
            "unit": "short",
            "min": 0
          }
        }
      },
      {
        "id": 2,
        "title": "Classification Accuracy",
        "type": "stat",
        "targets": [
          {
            "expr": "classification_accuracy",
            "legendFormat": "Accuracy %"
          }
        ],
        "fieldConfig": {
          "defaults": {
            "unit": "percent",
            "min": 0,
            "max": 100
          }
        }
      },
      {
        "id": 3,
        "title": "Processing Time Distribution",
        "type": "heatmap",
        "targets": [
          {
            "expr": "rate(email_processing_duration_seconds_bucket[5m])",
            "legendFormat": "{{le}}"
          }
        ]
      },
      {
        "id": 4,
        "title": "Agent Performance",
        "type": "table",
        "targets": [
          {
            "expr": "avg_over_time(agent_confidence_score[1h]) by (agent_type)",
            "legendFormat": "{{agent_type}}"
          }
        ]
      },
      {
        "id": 5,
        "title": "Escalation Rate Trend",
        "type": "timeseries",
        "targets": [
          {
            "expr": "escalation_rate",
            "legendFormat": "Escalation Rate"
          }
        ],
        "fieldConfig": {
          "defaults": {
            "unit": "percent"
          }
        }
      }
    ],
    "time": {
      "from": "now-6h",
      "to": "now"
    },
    "refresh": "30s"
  }
}
```

### Alerting Rules

```yaml
# prometheus/rules/email_triage.yml
groups:
  - name: email_triage_alerts
    rules:
      - alert: HighEscalationRate
        expr: escalation_rate > 10
        for: 5m
        labels:
          severity: warning
        annotations:
          summary: "High escalation rate detected"
          description: "Escalation rate is {{ $value }}%, above 10% threshold"

      - alert: LowClassificationAccuracy
        expr: classification_accuracy < 85
        for: 10m
        labels:
          severity: critical
        annotations:
          summary: "Classification accuracy below threshold"
          description: "Classification accuracy is {{ $value }}%, below 85% threshold"

      - alert: EmailProcessingBacklog
        expr: workflow_active_count > 100
        for: 5m
        labels:
          severity: warning
        annotations:
          summary: "Email processing backlog detected"
          description: "{{ $value }} active workflows, possible backlog"

      - alert: AgentFailureRate
        expr: rate(agent_execution_total{status="failed"}[5m]) / rate(agent_execution_total[5m]) > 0.05
        for: 5m
        labels:
          severity: warning
        annotations:
          summary: "High agent failure rate"
          description: "Agent failure rate is {{ $value | humanizePercentage }}"

      - alert: SLAViolation
        expr: sla_compliance < 90
        for: 10m
        labels:
          severity: critical
        annotations:
          summary: "SLA compliance violation"
          description: "SLA compliance is {{ $value }}% for {{ $labels.urgency_level }} emails"

      - alert: ExternalAPIFailure
        expr: rate(external_api_calls{status="error"}[5m]) > 0.1
        for: 3m
        labels:
          severity: warning
        annotations:
          summary: "External API failures detected"
          description: "{{ $labels.system }} API failure rate: {{ $value | humanizePercentage }}"
```

---

## Deployment Topology

### Infrastructure Architecture

```mermaid
graph TB
    subgraph "Load Balancer Layer"
        ALB[Application Load Balancer]
        SSL[SSL Termination]
    end

    subgraph "Application Tier"
        subgraph "Web Services"
            WEB1[Web Server 1]
            WEB2[Web Server 2]
            WEB3[Web Server 3]
        end

        subgraph "API Services"
            API1[API Gateway 1]
            API2[API Gateway 2]
        end

        subgraph "Processing Services"
            PROC1[Processing Node 1]
            PROC2[Processing Node 2]
            PROC3[Processing Node 3]
        end
    end

    subgraph "Data Tier"
        subgraph "Primary Database"
            NEO4J_MASTER[Neo4j Master]
            POSTGRES_MASTER[PostgreSQL Master]
        end

        subgraph "Read Replicas"
            NEO4J_REPLICA[Neo4j Read Replica]
            POSTGRES_REPLICA[PostgreSQL Read Replica]
        end

        subgraph "Cache Layer"
            REDIS_CLUSTER[Redis Cluster]
        end
    end

    subgraph "External Integration"
        IMAP[IMAP Servers]
        CRM[CRM Systems]
        SMTP[SMTP Servers]
    end

    ALB --> API1
    ALB --> API2
    API1 --> PROC1
    API1 --> PROC2
    API2 --> PROC2
    API2 --> PROC3

    PROC1 --> NEO4J_MASTER
    PROC2 --> NEO4J_MASTER
    PROC3 --> NEO4J_MASTER

    PROC1 --> POSTGRES_MASTER
    PROC2 --> POSTGRES_MASTER
    PROC3 --> POSTGRES_MASTER

    PROC1 --> REDIS_CLUSTER
    PROC2 --> REDIS_CLUSTER
    PROC3 --> REDIS_CLUSTER

    PROC1 --> IMAP
    PROC2 --> CRM
    PROC3 --> SMTP
```

### Kubernetes Deployment

```yaml
# k8s/namespace.yaml
apiVersion: v1
kind: Namespace
metadata:
  name: zetify-d2p2
  labels:
    name: zetify-d2p2

---
# k8s/configmap.yaml
apiVersion: v1
kind: ConfigMap
metadata:
  name: zetify-config
  namespace: zetify-d2p2
data:
  confidence_threshold: "0.65"
  retry_attempts: "3"
  processing_timeout: "30"
  log_level: "info"

---
# k8s/secret.yaml
apiVersion: v1
kind: Secret
metadata:
  name: zetify-secrets
  namespace: zetify-d2p2
type: Opaque
data:
  openai_api_key: <base64-encoded>
  anthropic_api_key: <base64-encoded>
  postgres_password: <base64-encoded>
  neo4j_password: <base64-encoded>

---
# k8s/agent-orchestrator-deployment.yaml
apiVersion: apps/v1
kind: Deployment
metadata:
  name: agent-orchestrator
  namespace: zetify-d2p2
  labels:
    app: agent-orchestrator
spec:
  replicas: 3
  selector:
    matchLabels:
      app: agent-orchestrator
  template:
    metadata:
      labels:
        app: agent-orchestrator
    spec:
      containers:
      - name: agent-orchestrator
        image: zetify/agent-orchestrator:latest
        ports:
        - containerPort: 8000
        env:
        - name: OPENAI_API_KEY
          valueFrom:
            secretKeyRef:
              name: zetify-secrets
              key: openai_api_key
        - name: POSTGRES_URL
          value: "postgresql://user:$(POSTGRES_PASSWORD)@postgres:5432/zetify_d2p2"
        envFrom:
        - configMapRef:
            name: zetify-config
        resources:
          requests:
            memory: "1Gi"
            cpu: "500m"
          limits:
            memory: "2Gi"
            cpu: "2000m"
        livenessProbe:
          httpGet:
            path: /health
            port: 8000
          initialDelaySeconds: 30
          periodSeconds: 10
        readinessProbe:
          httpGet:
            path: /ready
            port: 8000
          initialDelaySeconds: 5
          periodSeconds: 5
        volumeMounts:
        - name: logs
          mountPath: /app/logs
      volumes:
      - name: logs
        persistentVolumeClaim:
          claimName: orchestrator-logs-pvc

---
# k8s/service.yaml
apiVersion: v1
kind: Service
metadata:
  name: agent-orchestrator-service
  namespace: zetify-d2p2
spec:
  selector:
    app: agent-orchestrator
  ports:
  - protocol: TCP
    port: 80
    targetPort: 8000
  type: ClusterIP

---
# k8s/ingress.yaml
apiVersion: networking.k8s.io/v1
kind: Ingress
metadata:
  name: zetify-ingress
  namespace: zetify-d2p2
  annotations:
    nginx.ingress.kubernetes.io/rewrite-target: /
    cert-manager.io/cluster-issuer: "letsencrypt-prod"
spec:
  tls:
  - hosts:
    - api.zetify-d2p2.local
    secretName: zetify-tls
  rules:
  - host: api.zetify-d2p2.local
    http:
      paths:
      - path: /
        pathType: Prefix
        backend:
          service:
            name: agent-orchestrator-service
            port:
              number: 80

---
# k8s/hpa.yaml
apiVersion: autoscaling/v2
kind: HorizontalPodAutoscaler
metadata:
  name: agent-orchestrator-hpa
  namespace: zetify-d2p2
spec:
  scaleTargetRef:
    apiVersion: apps/v1
    kind: Deployment
    name: agent-orchestrator
  minReplicas: 2
  maxReplicas: 10
  metrics:
  - type: Resource
    resource:
      name: cpu
      target:
        type: Utilization
        averageUtilization: 70
  - type: Resource
    resource:
      name: memory
      target:
        type: Utilization
        averageUtilization: 80
```

---

## Component Diagrams

### System Component Overview

```mermaid
C4Component
    title Component Diagram - Zetify D2P2 Email Triage System

    Container_Boundary(api, "API Layer") {
        Component(gateway, "API Gateway", "Kong/Nginx", "Route requests, rate limiting, auth")
        Component(ingestion_api, "Ingestion API", "Node.js/Express", "Email intake endpoints")
        Component(workflow_api, "Workflow API", "Python/FastAPI", "Workflow management")
    }

    Container_Boundary(processing, "Processing Layer") {
        Component(orchestrator, "Agent Orchestrator", "Python/LangGraph", "Coordinate agent execution")
        Component(classifier, "Classifier Agent", "Python/OpenAI", "Email classification")
        Component(urgency, "Urgency Agent", "Python/Anthropic", "Urgency assessment")
        Component(retriever, "Retriever Agent", "Node.js", "Context retrieval")
        Component(router, "Router Agent", "Python", "Routing decisions")
        Component(assurance, "Assurance Engine", "Python/scikit-learn", "Quality assurance")
    }

    Container_Boundary(data, "Data Layer") {
        ComponentDb(neo4j, "Neo4j", "Graph Database", "Ontology and relationships")
        ComponentDb(postgres, "PostgreSQL", "Relational Database", "Audit logs and metrics")
        ComponentDb(redis, "Redis", "Cache", "Session and temporary data")
    }

    Container_Boundary(external, "External Systems") {
        Component(imap, "IMAP Server", "Email", "Email source")
        Component(crm, "CRM Systems", "Salesforce/HubSpot", "Customer data")
        Component(smtp, "SMTP Server", "Email", "Email delivery")
    }

    Rel(gateway, ingestion_api, "Routes requests")
    Rel(gateway, workflow_api, "Routes requests")
    Rel(ingestion_api, orchestrator, "Triggers workflow")
    Rel(orchestrator, classifier, "Executes")
    Rel(orchestrator, urgency, "Executes")
    Rel(orchestrator, retriever, "Executes")
    Rel(orchestrator, router, "Executes")
    Rel(orchestrator, assurance, "Validates")

    Rel(classifier, neo4j, "Stores classification")
    Rel(urgency, neo4j, "Stores urgency")
    Rel(orchestrator, postgres, "Logs workflow")
    Rel(orchestrator, redis, "Caches state")

    Rel(ingestion_api, imap, "Fetches emails")
    Rel(retriever, crm, "Retrieves context")
    Rel(router, smtp, "Sends emails")
```

### Agent Interaction Flow

```mermaid
sequenceDiagram
    participant Email as Email Source
    participant Ingest as Ingestion Service
    participant Orch as Orchestrator
    participant Class as Classifier Agent
    participant Urg as Urgency Agent
    participant Ret as Retriever Agent
    participant Route as Router Agent
    participant Crit as Critique Agent
    participant Assur as Assurance Engine
    participant Output as Email Router

    Email->>Ingest: New email received
    Ingest->>Ingest: Parse & normalize
    Ingest->>Orch: Trigger workflow

    Orch->>Class: Classify email
    Class->>Class: Analyze content
    Class->>Orch: Classification result

    Orch->>Urg: Assess urgency
    Urg->>Urg: Analyze urgency
    Urg->>Orch: Urgency result

    Orch->>Ret: Retrieve context
    Ret->>External: Query CRM/tickets
    External->>Ret: Context data
    Ret->>Orch: Context result

    Orch->>Route: Make routing decision
    Route->>Route: Combine all inputs
    Route->>Orch: Routing decision

    Orch->>Crit: Critique decision
    Crit->>Crit: Validate outputs
    Crit->>Orch: Critique result

    Orch->>Assur: Calculate confidence
    Assur->>Assur: Score decision

    alt Confidence >= 0.65
        Assur->>Output: Route email
        Output->>Destination: Forward with context
    else Confidence < 0.65
        Assur->>Orch: Retry with different approach
        Note over Orch: Retry loop or escalate
    end
```

---

## Data Flow Architecture

### Email Processing Pipeline

```mermaid
flowchart TD
    A[Email Received] --> B[IMAP Ingestion]
    B --> C[MIME Parsing]
    C --> D[Attachment Extraction]
    D --> E[PII Detection & Masking]
    E --> F[Content Normalization]
    F --> G[OCR Processing]
    G --> H[Store in Neo4j]

    H --> I[Workflow Trigger]
    I --> J[Agent Orchestration]

    J --> K[Parallel Agent Execution]
    K --> L[Classifier Agent]
    K --> M[Urgency Agent]
    K --> N[Retriever Agent]

    L --> O[Intent Classification]
    M --> P[Urgency Assessment]
    N --> Q[Context Enrichment]

    O --> R[Router Agent]
    P --> R
    Q --> R

    R --> S[Routing Decision]
    S --> T[Critique Agent]
    T --> U[Assurance Engine]

    U --> V{Confidence Check}
    V -->|>= 0.65| W[Route Email]
    V -->|< 0.65| X[Retry/Escalate]

    W --> Y[Generate Context Note]
    Y --> Z[Forward to Destination]
    Z --> AA[Audit Logging]

    X --> BB[Human Review]
    X --> CC[Alternative Strategy]
    CC --> J
```

### Data Storage Strategy

```mermaid
erDiagram
    Email ||--o{ Classification : has
    Email ||--o{ Context : enriched_with
    Email ||--|| Workflow : processed_by
    Email ||--o{ AuditLog : generates

    Classification ||--|| Intent : classified_as
    Classification ||--|| Department : assigned_to
    Classification ||--|| Agent : performed_by

    Workflow ||--o{ AgentExecution : contains
    Workflow ||--|| AssuranceScore : evaluated_by

    AgentExecution ||--|| Agent : executed_by
    AgentExecution ||--o{ Performance : measured_by

    Intent ||--|| Department : routes_to
    Department ||--o{ SLA : governed_by

    Context ||--o{ ExternalData : includes
    ExternalData ||--|| CRMRecord : references

    Email {
        uuid id PK
        string from
        string subject
        text body_text
        json attachments
        datetime timestamp
        string message_id
        string thread_id
        boolean pii_masked
    }

    Classification {
        uuid id PK
        uuid email_id FK
        string intent
        string department
        float confidence
        text reasoning
        json signals
        datetime created_at
    }

    Workflow {
        uuid id PK
        uuid email_id FK
        string status
        datetime started_at
        datetime completed_at
        json agent_results
        float final_confidence
    }

    AuditLog {
        bigint id PK
        uuid email_id FK
        uuid workflow_id FK
        string agent_type
        string action
        json input_data
        json output_data
        float confidence_score
        int processing_time_ms
        timestamp created_at
    }
```

---

## Integration Patterns

### IMAP Integration Pattern

```python
# Email ingestion with IMAP
import imaplib
import email
from email.mime.multipart import MIMEMultipart
import asyncio
from typing import List, Dict, Optional

class IMAPEmailIngestion:
    def __init__(self, config: Dict):
        self.host = config['host']
        self.port = config['port']
        self.username = config['username']
        self.password = config['password']
        self.folder = config.get('folder', 'INBOX')
        self.connection = None

    async def connect(self):
        """Establish IMAP connection"""
        try:
            self.connection = imaplib.IMAP4_SSL(self.host, self.port)
            self.connection.login(self.username, self.password)
            self.connection.select(self.folder)
            return True
        except Exception as e:
            logger.error(f"IMAP connection failed: {e}")
            return False

    async def fetch_new_emails(self) -> List[Dict]:
        """Fetch unread emails"""
        if not self.connection:
            await self.connect()

        try:
            # Search for unread emails
            status, messages = self.connection.search(None, 'UNSEEN')
            email_ids = messages[0].split()

            emails = []
            for email_id in email_ids:
                # Fetch email
                status, msg_data = self.connection.fetch(email_id, '(RFC822)')
                msg = email.message_from_bytes(msg_data[0][1])

                # Parse email
                parsed_email = await self._parse_email(msg)
                parsed_email['imap_id'] = email_id.decode()
                emails.append(parsed_email)

                # Mark as read
                self.connection.store(email_id, '+FLAGS', '\\Seen')

            return emails

        except Exception as e:
            logger.error(f"Error fetching emails: {e}")
            return []

    async def _parse_email(self, msg) -> Dict:
        """Parse email message"""
        email_data = {
            'id': str(uuid.uuid4()),
            'from': msg.get('From'),
            'to': msg.get('To'),
            'subject': msg.get('Subject'),
            'date': msg.get('Date'),
            'message_id': msg.get('Message-ID'),
            'in_reply_to': msg.get('In-Reply-To'),
            'body_text': '',
            'body_html': '',
            'attachments': []
        }

        # Extract body and attachments
        if msg.is_multipart():
            for part in msg.walk():
                await self._process_email_part(part, email_data)
        else:
            content_type = msg.get_content_type()
            body = msg.get_payload(decode=True).decode('utf-8', errors='ignore')

            if content_type == 'text/plain':
                email_data['body_text'] = body
            elif content_type == 'text/html':
                email_data['body_html'] = body

        return email_data

    async def _process_email_part(self, part, email_data: Dict):
        """Process individual email part"""
        content_type = part.get_content_type()
        content_disposition = str(part.get('Content-Disposition'))

        if content_type == 'text/plain' and 'attachment' not in content_disposition:
            body = part.get_payload(decode=True).decode('utf-8', errors='ignore')
            email_data['body_text'] = body

        elif content_type == 'text/html' and 'attachment' not in content_disposition:
            body = part.get_payload(decode=True).decode('utf-8', errors='ignore')
            email_data['body_html'] = body

        elif 'attachment' in content_disposition:
            filename = part.get_filename()
            if filename:
                attachment_data = part.get_payload(decode=True)
                attachment_info = {
                    'filename': filename,
                    'content_type': content_type,
                    'size': len(attachment_data),
                    'content': base64.b64encode(attachment_data).decode()
                }
                email_data['attachments'].append(attachment_info)
```

### CRM Integration Pattern

```python
# CRM integration with multiple providers
from abc import ABC, abstractmethod
from typing import Dict, Optional, List
import aiohttp
import asyncio

class CRMProvider(ABC):
    @abstractmethod
    async def lookup_contact(self, email: str) -> Optional[Dict]:
        pass

    @abstractmethod
    async def get_account_info(self, contact_id: str) -> Optional[Dict]:
        pass

    @abstractmethod
    async def get_interaction_history(self, contact_id: str) -> List[Dict]:
        pass

class SalesforceProvider(CRMProvider):
    def __init__(self, config: Dict):
        self.instance_url = config['instance_url']
        self.client_id = config['client_id']
        self.client_secret = config['client_secret']
        self.username = config['username']
        self.password = config['password']
        self.access_token = None

    async def authenticate(self):
        """OAuth authentication with Salesforce"""
        auth_url = f"{self.instance_url}/services/oauth2/token"
        data = {
            'grant_type': 'password',
            'client_id': self.client_id,
            'client_secret': self.client_secret,
            'username': self.username,
            'password': self.password
        }

        async with aiohttp.ClientSession() as session:
            async with session.post(auth_url, data=data) as response:
                if response.status == 200:
                    result = await response.json()
                    self.access_token = result['access_token']
                    return True
                return False

    async def lookup_contact(self, email: str) -> Optional[Dict]:
        """Look up contact by email"""
        if not self.access_token:
            await self.authenticate()

        query = f"SELECT Id, FirstName, LastName, Email, AccountId FROM Contact WHERE Email = '{email}'"
        url = f"{self.instance_url}/services/data/v58.0/query"

        headers = {
            'Authorization': f'Bearer {self.access_token}',
            'Content-Type': 'application/json'
        }

        async with aiohttp.ClientSession() as session:
            async with session.get(url, headers=headers, params={'q': query}) as response:
                if response.status == 200:
                    result = await response.json()
                    if result['totalSize'] > 0:
                        return result['records'][0]
                return None

    async def get_account_info(self, account_id: str) -> Optional[Dict]:
        """Get account information"""
        url = f"{self.instance_url}/services/data/v58.0/sobjects/Account/{account_id}"
        headers = {'Authorization': f'Bearer {self.access_token}'}

        async with aiohttp.ClientSession() as session:
            async with session.get(url, headers=headers) as response:
                if response.status == 200:
                    return await response.json()
                return None

class HubSpotProvider(CRMProvider):
    def __init__(self, config: Dict):
        self.api_key = config['api_key']
        self.base_url = 'https://api.hubapi.com'

    async def lookup_contact(self, email: str) -> Optional[Dict]:
        """Look up contact by email in HubSpot"""
        url = f"{self.base_url}/crm/v3/objects/contacts"
        headers = {'Authorization': f'Bearer {self.api_key}'}
        params = {
            'filterGroups': [
                {
                    'filters': [
                        {
                            'propertyName': 'email',
                            'operator': 'EQ',
                            'value': email
                        }
                    ]
                }
            ]
        }

        async with aiohttp.ClientSession() as session:
            async with session.post(url + '/search',
                                   headers=headers,
                                   json=params) as response:
                if response.status == 200:
                    result = await response.json()
                    if result['total'] > 0:
                        return result['results'][0]
                return None

class CRMIntegrationService:
    def __init__(self, providers: List[CRMProvider]):
        self.providers = providers

    async def enrich_email_context(self, sender_email: str) -> Dict:
        """Enrich email with CRM context from multiple providers"""
        context = {
            'contact_info': None,
            'account_info': None,
            'interaction_history': [],
            'customer_tier': 'unknown',
            'relationship_score': 0.0
        }

        # Try each provider until we find the contact
        for provider in self.providers:
            try:
                contact = await provider.lookup_contact(sender_email)
                if contact:
                    context['contact_info'] = contact

                    # Get additional account information
                    if 'AccountId' in contact:
                        account = await provider.get_account_info(contact['AccountId'])
                        context['account_info'] = account

                    # Get interaction history
                    if 'Id' in contact:
                        history = await provider.get_interaction_history(contact['Id'])
                        context['interaction_history'] = history

                    break

            except Exception as e:
                logger.warning(f"CRM provider {provider.__class__.__name__} failed: {e}")
                continue

        # Calculate relationship score and tier
        context['customer_tier'] = self._determine_customer_tier(context)
        context['relationship_score'] = self._calculate_relationship_score(context)

        return context

    def _determine_customer_tier(self, context: Dict) -> str:
        """Determine customer tier based on account info"""
        if not context['account_info']:
            return 'prospect'

        account = context['account_info']
        annual_revenue = account.get('AnnualRevenue', 0)

        if annual_revenue > 1000000:
            return 'enterprise'
        elif annual_revenue > 100000:
            return 'premium'
        else:
            return 'standard'

    def _calculate_relationship_score(self, context: Dict) -> float:
        """Calculate relationship score based on interaction history"""
        if not context['interaction_history']:
            return 0.0

        # Simple scoring based on interaction frequency and recency
        interactions = context['interaction_history']
        score = min(len(interactions) * 0.1, 1.0)  # Cap at 1.0

        # Boost score for recent interactions
        recent_interactions = [i for i in interactions
                             if 'LastModifiedDate' in i and
                             (datetime.now() - datetime.fromisoformat(i['LastModifiedDate'])).days < 30]

        if recent_interactions:
            score += 0.2

        return min(score, 1.0)
```

### Webhook Integration Pattern

```python
# Webhook system for external notifications
from fastapi import FastAPI, BackgroundTasks, HTTPException
from pydantic import BaseModel
from typing import Dict, List, Optional
import aiohttp
import asyncio
from datetime import datetime

class WebhookEvent(BaseModel):
    event_type: str
    email_id: str
    workflow_id: str
    timestamp: datetime
    data: Dict

class WebhookSubscription(BaseModel):
    id: str
    url: str
    events: List[str]
    active: bool
    secret: Optional[str] = None
    retry_config: Dict = {
        'max_retries': 3,
        'retry_delay': 5,
        'exponential_backoff': True
    }

class WebhookService:
    def __init__(self):
        self.subscriptions: Dict[str, WebhookSubscription] = {}
        self.event_queue = asyncio.Queue()
        self.running = False

    async def start(self):
        """Start webhook processing"""
        self.running = True
        asyncio.create_task(self._process_events())

    async def stop(self):
        """Stop webhook processing"""
        self.running = False

    def subscribe(self, subscription: WebhookSubscription):
        """Add webhook subscription"""
        self.subscriptions[subscription.id] = subscription

    def unsubscribe(self, subscription_id: str):
        """Remove webhook subscription"""
        if subscription_id in self.subscriptions:
            del self.subscriptions[subscription_id]

    async def emit_event(self, event: WebhookEvent):
        """Emit event to webhook queue"""
        await self.event_queue.put(event)

    async def _process_events(self):
        """Process webhook events from queue"""
        while self.running:
            try:
                # Wait for event with timeout
                event = await asyncio.wait_for(
                    self.event_queue.get(),
                    timeout=1.0
                )

                # Send to all matching subscriptions
                tasks = []
                for subscription in self.subscriptions.values():
                    if (subscription.active and
                        event.event_type in subscription.events):
                        tasks.append(
                            self._send_webhook(subscription, event)
                        )

                if tasks:
                    await asyncio.gather(*tasks, return_exceptions=True)

            except asyncio.TimeoutError:
                continue
            except Exception as e:
                logger.error(f"Error processing webhook event: {e}")

    async def _send_webhook(self, subscription: WebhookSubscription, event: WebhookEvent):
        """Send webhook to subscriber"""
        payload = {
            'event': event.event_type,
            'data': event.dict(),
            'timestamp': event.timestamp.isoformat()
        }

        headers = {
            'Content-Type': 'application/json',
            'User-Agent': 'Zetify-D2P2-Webhook/1.0'
        }

        # Add signature if secret is provided
        if subscription.secret:
            signature = self._generate_signature(payload, subscription.secret)
            headers['X-Webhook-Signature'] = signature

        retry_count = 0
        max_retries = subscription.retry_config['max_retries']
        base_delay = subscription.retry_config['retry_delay']

        while retry_count <= max_retries:
            try:
                async with aiohttp.ClientSession() as session:
                    async with session.post(
                        subscription.url,
                        json=payload,
                        headers=headers,
                        timeout=aiohttp.ClientTimeout(total=30)
                    ) as response:

                        if response.status in [200, 201, 204]:
                            logger.info(f"Webhook sent successfully to {subscription.url}")
                            return
                        else:
                            raise aiohttp.ClientResponseError(
                                request_info=response.request_info,
                                history=response.history,
                                status=response.status
                            )

            except Exception as e:
                retry_count += 1
                if retry_count > max_retries:
                    logger.error(f"Webhook failed after {max_retries} retries: {e}")
                    break

                # Calculate delay with exponential backoff
                if subscription.retry_config['exponential_backoff']:
                    delay = base_delay * (2 ** (retry_count - 1))
                else:
                    delay = base_delay

                logger.warning(f"Webhook failed, retrying in {delay}s: {e}")
                await asyncio.sleep(delay)

# Usage in email processing
async def email_processed_webhook(email_id: str, workflow_id: str, result: Dict):
    """Send webhook when email processing completes"""
    event = WebhookEvent(
        event_type='email.processed',
        email_id=email_id,
        workflow_id=workflow_id,
        timestamp=datetime.utcnow(),
        data={
            'classification': result['classification'],
            'routing_decision': result['routing'],
            'confidence_score': result['confidence'],
            'processing_time_ms': result['processing_time']
        }
    )

    await webhook_service.emit_event(event)
```

---

## Security Architecture

### Authentication & Authorization

```yaml
security_framework:
  authentication:
    methods:
      - jwt_tokens:
          issuer: "zetify-d2p2"
          algorithm: "RS256"
          access_token_ttl: "15m"
          refresh_token_ttl: "7d"

      - api_keys:
          format: "ztf_"
          length: 32
          scoped: true
          rate_limited: true

      - oauth2:
          providers: ["google", "microsoft"]
          scopes: ["email", "profile"]

  authorization:
    model: "RBAC"
    roles:
      system_admin:
        permissions: ["*"]

      operator:
        permissions:
          - "workflows:read"
          - "workflows:manage"
          - "metrics:read"
          - "agents:manage"

      viewer:
        permissions:
          - "workflows:read"
          - "metrics:read"

      service_account:
        permissions:
          - "emails:ingest"
          - "workflows:execute"
          - "webhooks:send"

  data_protection:
    encryption:
      at_rest:
        algorithm: "AES-256-GCM"
        key_management: "HashiCorp Vault"

      in_transit:
        min_tls: "1.2"
        preferred_tls: "1.3"
        certificate_authority: "Let's Encrypt"

    pii_handling:
      detection: "Microsoft Presidio"
      masking:
        email: "***@***.com"
        phone: "***-***-****"
        ssn: "***-**-****"
        credit_card: "**** **** **** ****"

      retention:
        original_data: "30 days"
        masked_data: "2 years"
        audit_logs: "7 years"

  compliance:
    standards:
      - GDPR
      - CCPA
      - SOC2
      - HIPAA (if healthcare)

    implementations:
      gdpr:
        right_to_access: true
        right_to_rectification: true
        right_to_erasure: true
        data_portability: true
        consent_management: true

      audit_logging:
        all_data_access: true
        all_modifications: true
        retention_period: "7 years"
        tamper_proof: true
```

### Secrets Management

```yaml
# vault/config/vault.hcl
storage "file" {
  path = "/vault/data"
}

listener "tcp" {
  address = "0.0.0.0:8200"
  tls_disable = false
  tls_cert_file = "/vault/config/vault.crt"
  tls_key_file = "/vault/config/vault.key"
}

api_addr = "https://vault:8200"
cluster_addr = "https://vault:8201"
ui = true

# Enable KV secrets engine
path "secret/*" {
  capabilities = ["create", "read", "update", "delete", "list"]
}

# Database secrets
path "database/creds/zetify-readonly" {
  capabilities = ["read"]
}

path "database/creds/zetify-readwrite" {
  capabilities = ["read"]
}

# API keys
path "secret/api-keys/*" {
  capabilities = ["read"]
}
```

---

This comprehensive architecture document provides a complete system design for the Zetify D2P2 email triage POC. The architecture is designed to be:

1. **Scalable**: Microservices can be independently scaled based on load
2. **Resilient**: Multiple failure recovery mechanisms and assurance layers
3. **Observable**: Complete monitoring and audit trail capabilities
4. **Secure**: End-to-end security with PII protection and compliance
5. **Maintainable**: Clear service boundaries and well-defined interfaces
6. **Extensible**: Agent-based architecture allows for easy addition of new capabilities

The design supports all the requirements from the PRD while providing a robust foundation for production deployment.