
# Zetify D2P2 – Product Requirements Document (PRD v1)

**PoC Use Case: info@company.com Email Triage**

---

## 1. Overview
Zetify’s D2P2 platform aims to prove that **agentic, GenAI-native process execution** is superior to deterministic software. 
The PoC implements the **info@company.com triage process**, where incoming emails are automatically classified, 
routed, and enriched with context notes.

**Demonstration goals:**
- Replace manual triage (~3–5 hours/day) with an agent loop.
- Prove adaptability: handle new/unseen categories with minimal manual coding.
- Deliver measurable improvements in accuracy (>90%), SLA compliance (<1h for urgent mails), and cost reduction (~70%).

---

## 2. Goals & Success Criteria

### Functional Goals
1. Ingest and normalize all emails (incl. attachments, threads).
2. Classify emails by intent (support, sales, HR, PR, legal, finance, spam).
3. Detect urgency (normal, urgent, deadline-sensitive).
4. Enrich with context notes (CRM lookup, prior ticket data).
5. Route to correct departmental mailbox/system.
6. Detect low-confidence cases and trigger Assurance workflow:
   - Retry via diversity (alt. prompts/models).
   - Escalate to human with structured summary.

### Success KPIs
- ≥90% correct routing after 6 weeks.
- SLA: urgent mails <1h, routine <4h.
- Misrouting <2%.
- Escalation <5%.
- 100% decision audit trail coverage.

---

## 3. Users & Roles
- **Mailbox Owner** – Human fallback for escalations, verifies ambiguous cases.
- **Business Units (Sales, HR, Legal, Support, PR)** – Receive routed emails + context notes.
- **System Operator (CIO/IT)** – Deploys stack on GCP/VM/MacBook, monitors metrics.

---

## 4. Functional Requirements

### 4.1 Input & Normalization
- Ingest via IMAP/Graph API.
- Parse MIME/HTML → plain text.
- OCR for attachments (PDF, image).
- Strip PII (replace with tokens).

### 4.2 Process Space (Dynamic Digital Twin v0)
- Ontology: EmailIntent, Urgency, Department, Policy, SLA, Escalation.
- Stored in Neo4j or JSON-graph store.

### 4.3 Agents & Loop Runtime

**Agents v0:**
1. **ClassifierAgent** – intent detection.
2. **UrgencyAgent** – urgency detection.
3. **RetrieverAgent** – fetch CRM/ticket context.
4. **RouterAgent** – decide route + draft context note.
5. **CritiqueAgent** – validate outputs.
6. **RefinerAgent** – improve low-score outputs.
7. **EscalatorAgent** – human review packet.

**Loop Orchestration**
- Agents run via LangGraph or CrewAI.
- Memory layers: episodic, semantic, procedural.

### 4.4 Assurance Layer
- Score = weighted (confidence, policy checks, ambiguity).
- Retry strategies: alt. prompts, models, ensembles.
- Escalation threshold = <0.65.

### 4.5 Output & Audit
- Forward to target mailbox/Teams/Slack.
- Attach context note (Intent, Urgency, Account, Tickets, Next step).
- Store audit log as JSON record.

---

## 5. Non-Functional Requirements
- Deployment: Docker Compose on Debian VM or MacBook Pro.
- Models: OpenAI, Anthropic, local LLaMA.
- Latency: <30s per mail.
- Security: PII masking, Vault secrets.
- Observability: Prometheus, Grafana.

---

## 6. Data Models

### Email Schema
```json
{
  "id": "uuid",
  "from": "string",
  "subject": "string",
  "body_text": "string",
  "attachments": ["file_ref"],
  "timestamp": "ISO8601"
}
```

### ClassifierAgent Output
```json
{
  "status": "ok|needs_review",
  "intent": "support|sales|bd|hr|pr|legal|finance|spam|other",
  "department": "support|sales|bd|hr|pr|legal|finance|ops",
  "confidence": 0.0,
  "secondary_intents": [],
  "signals": {"is_deadline":false,"is_legal_risk":false,"is_hr_sensitive":false},
  "reasoning": "brief"
}
```

### Assurance Score
```json
{
  "confidence": 0.82,
  "ambiguity": 0.18,
  "policy_hits": ["HR_CONFIDENTIAL"],
  "action": "accept|retry|escalate"
}
```

---

## 7. Risks & Mitigations
- **Ambiguity spikes** → Agent Creator generates specialist agents.
- **Model drift** → refresh prompts monthly.
- **Latency** → fallback to smaller models.
- **Trust gap** → transparent audit logs.

---

## 8. Acceptance Criteria
- Deployment works on GCP + MacBook.
- ≥90% routing accuracy.
- SLA: urgent <1h, routine <4h.
- <5% escalations, <2% misroutes.
- 100% audit coverage.

---

# Appendix: Agent Prompt Specifications

(Here all the detailed agent prompts and schemas we defined earlier should be included, e.g. ClassifierAgent, UrgencyAgent, RouterAgent, CritiqueAgent, RefinerAgent, EscalatorAgent, TestDesignerAgent with full schemas and example prompts.)

---

**End of PRD v1**
