# Zetify D2P2 - Email Triage POC

[![License: MIT](https://img.shields.io/badge/License-MIT-yellow.svg)](https://opensource.org/licenses/MIT)
[![TypeScript](https://img.shields.io/badge/TypeScript-5.0+-blue.svg)](https://www.typescriptlang.org/)
[![Node.js](https://img.shields.io/badge/Node.js-18+-green.svg)](https://nodejs.org/)
[![Test Coverage](https://img.shields.io/badge/Coverage-90%+-brightgreen.svg)](https://github.com/your-org/zetify-d2p2)

> **GenAI-native agentic process execution for intelligent email triage**

Zetify D2P2 (Data-to-Process-to-Productivity) is a proof-of-concept demonstrating that **agentic, GenAI-native process execution** is superior to deterministic software. This POC implements an intelligent email triage system that automatically classifies, routes, and enriches incoming emails using a coordinated swarm of 7 specialized AI agents.

## 🎯 Overview

The system replaces manual email triage (~3-5 hours/day) with an autonomous agent loop that:

- **Automatically classifies** emails by intent (support, sales, HR, legal, etc.)
- **Detects urgency** and assigns SLA timeframes
- **Enriches context** with CRM lookups and historical data
- **Routes intelligently** to appropriate departments
- **Ensures quality** through confidence scoring and human escalation
- **Maintains full audit trails** for compliance and optimization

### Key Success Metrics
- ≥90% routing accuracy after 6 weeks
- SLA compliance: urgent emails <1h, routine <4h
- <2% misrouting rate
- <5% escalation rate
- 100% decision audit trail coverage

## 🏗️ Architecture

### 7 Specialized AI Agents

1. **ClassifierAgent** - Intent detection and categorization
2. **UrgencyAgent** - SLA assignment and deadline detection
3. **RetrieverAgent** - Context enrichment from CRM/ticketing systems
4. **RouterAgent** - Department routing with context notes
5. **CritiqueAgent** - Quality validation and consistency checking
6. **RefinerAgent** - Low-confidence output improvement
7. **EscalatorAgent** - Human review packet generation

### System Components

```
┌─────────────────┐    ┌──────────────────┐    ┌─────────────────┐
│   Email Input   │───▶│  Agent Pipeline  │───▶│  Smart Routing  │
│   (IMAP/API)    │    │   (7 Agents)     │    │   & Context     │
└─────────────────┘    └──────────────────┘    └─────────────────┘
         │                       │                       │
         ▼                       ▼                       ▼
┌─────────────────┐    ┌──────────────────┐    ┌─────────────────┐
│ PII Protection  │    │ Assurance Layer  │    │  Audit & Logs   │
│   & Security    │    │ (Confidence &    │    │  (Full Trail)   │
└─────────────────┘    │  Escalation)     │    └─────────────────┘
                       └──────────────────┘
```

### Technology Stack

- **Runtime**: Node.js 18+ with TypeScript
- **AI Models**: OpenAI GPT-4, Anthropic Claude, Local LLaMA
- **Database**: Neo4j (ontology), PostgreSQL (audit), Redis (cache)
- **Email**: IMAP for ingestion, SMTP for routing
- **Monitoring**: Prometheus, Grafana
- **Security**: JWT auth, PII masking, Vault secrets
- **Deployment**: Docker Compose, Kubernetes ready

## 🚀 Quick Start

### Prerequisites

- Node.js 18.0+ and npm 9.0+
- Docker and Docker Compose
- Git

### Installation

1. **Clone the repository**
   ```bash
   git clone https://github.com/your-org/zetify-d2p2.git
   cd zetify-d2p2
   ```

2. **Install dependencies**
   ```bash
   cd src
   npm install
   ```

3. **Set up environment**
   ```bash
   cp .env.example .env
   # Edit .env with your configuration (see Configuration section)
   ```

4. **Start services with Docker**
   ```bash
   docker-compose up -d
   ```

5. **Build and run the application**
   ```bash
   npm run build
   npm start
   ```

### Quick Test

Send a test email to verify the system:

```bash
# Test the API directly
curl -X POST http://localhost:3000/api/v1/emails/process \
  -H "Content-Type: application/json" \
  -d '{
    "from": "customer@example.com",
    "subject": "Urgent: Payment issue with invoice #12345",
    "body": "Hi, I need immediate help with a payment problem..."
  }'
```

## ⚙️ Configuration

### Environment Variables

Create a `.env` file based on `.env.example`:

#### Core Settings
```bash
# Server
PORT=3000
NODE_ENV=production

# Databases
NEO4J_URI=neo4j://localhost:7687
NEO4J_USERNAME=neo4j
NEO4J_PASSWORD=your-secure-password

POSTGRES_HOST=localhost
POSTGRES_PORT=5432
POSTGRES_DB=zetify_audit
POSTGRES_USER=zetify
POSTGRES_PASSWORD=your-secure-password

REDIS_URL=redis://localhost:6379
```

#### Email Configuration
```bash
# IMAP (incoming emails)
IMAP_HOST=imap.gmail.com
IMAP_PORT=993
IMAP_USER=info@yourcompany.com
IMAP_PASSWORD=your-app-password
IMAP_TLS=true

# SMTP (outgoing routing)
SMTP_HOST=smtp.gmail.com
SMTP_PORT=587
SMTP_USER=noreply@yourcompany.com
SMTP_PASSWORD=your-app-password
```

#### AI Model APIs
```bash
# OpenAI
OPENAI_API_KEY=sk-your-openai-api-key

# Anthropic
ANTHROPIC_API_KEY=sk-ant-your-anthropic-key

# Local models (optional)
LOCAL_MODEL_ENDPOINT=http://localhost:8080/v1
```

#### Security
```bash
# JWT & Encryption
JWT_SECRET=your-super-secure-jwt-secret-key
ENCRYPTION_KEY=your-32-byte-encryption-key-here

# Confidence thresholds
CONFIDENCE_THRESHOLD=0.65
ESCALATION_THRESHOLD=0.5
RETRY_MAX_ATTEMPTS=3
```

#### CRM Integration (Optional)
```bash
# Salesforce
SALESFORCE_CLIENT_ID=your-salesforce-client-id
SALESFORCE_CLIENT_SECRET=your-salesforce-secret

# HubSpot
HUBSPOT_API_KEY=your-hubspot-api-key
```

## 🎮 Usage

### Starting the System

1. **Development mode** (with hot reload):
   ```bash
   npm run dev
   ```

2. **Production mode**:
   ```bash
   npm run build
   npm start
   ```

3. **With Docker Compose** (recommended):
   ```bash
   docker-compose up -d
   ```

### Processing Emails

#### Automatic IMAP Processing
The system automatically polls your IMAP inbox every 30 seconds and processes new emails.

#### Manual API Processing
```bash
# Process a single email
curl -X POST http://localhost:3000/api/v1/emails/process \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer YOUR_JWT_TOKEN" \
  -d '{
    "from": "customer@example.com",
    "to": ["info@yourcompany.com"],
    "subject": "Support request: Login issues",
    "body_text": "I cannot log into my account...",
    "timestamp": "2024-01-15T10:30:00Z"
  }'
```

#### Batch Processing
```bash
# Process multiple emails
curl -X POST http://localhost:3000/api/v1/emails/batch \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer YOUR_JWT_TOKEN" \
  -d '{
    "emails": [
      {"from": "sales@client.com", "subject": "Partnership proposal", ...},
      {"from": "support@vendor.com", "subject": "Service update", ...}
    ]
  }'
```

### Monitoring & Analytics

#### Real-time Dashboard
Access the monitoring dashboard at: `http://localhost:3001` (Grafana)

Key metrics displayed:
- Processing volume and latency
- Routing accuracy and confidence scores
- SLA compliance rates
- Agent performance metrics
- Error rates and escalations

#### API Endpoints

```bash
# System health
GET /api/v1/health

# Processing metrics
GET /api/v1/metrics

# Audit logs
GET /api/v1/audit?start_date=2024-01-01&end_date=2024-01-31

# Agent performance
GET /api/v1/agents/performance

# Workflow status
GET /api/v1/workflows/{workflow_id}/status
```

## 🧪 Testing

### Running Tests

```bash
# Run all tests
npm test

# Run with coverage
npm run test:coverage

# Run specific test suite
npm test -- tests/agents/

# Watch mode for development
npm run test:watch
```

### Test Categories

1. **Unit Tests** - Individual agent and component testing
2. **Integration Tests** - End-to-end workflow validation
3. **Performance Tests** - Load testing and SLA validation
4. **Security Tests** - PII protection and auth testing

## 📊 Performance Tuning

### Scaling Agents

Adjust concurrent agent execution in `src/config/workflow.json`:

```json
{
  "email_batch_size": 10,
  "parallel_processing": true,
  "max_concurrent_agents": 5,
  "confidence_threshold": 0.65,
  "escalation_threshold": 0.5
}
```

### Model Selection

Choose optimal models for your use case:

- **High Accuracy**: GPT-4, Claude-3-Opus (slower, expensive)
- **Balanced**: GPT-3.5-Turbo, Claude-3-Sonnet (recommended)
- **Fast/Cheap**: Local LLaMA, Claude-3-Haiku (for high volume)

## 🔒 Security

### PII Protection

The system automatically detects and masks PII:
- Email addresses → `<EMAIL_TOKEN_1>`
- Phone numbers → `<PHONE_TOKEN_1>`
- Names → `<NAME_TOKEN_1>`
- Addresses → `<ADDRESS_TOKEN_1>`

### Authentication

```bash
# Get access token
curl -X POST http://localhost:3000/api/v1/auth/login \
  -H "Content-Type: application/json" \
  -d '{
    "username": "admin",
    "password": "your-secure-password"
  }'

# Use token in requests
curl -X GET http://localhost:3000/api/v1/emails \
  -H "Authorization: Bearer YOUR_JWT_TOKEN"
```

## 🚀 Deployment

### Production Deployment

1. **Environment Setup**:
   ```bash
   # Use production environment
   export NODE_ENV=production

   # Set secure secrets
   export JWT_SECRET=$(openssl rand -base64 32)
   export ENCRYPTION_KEY=$(openssl rand -base64 32)
   ```

2. **Docker Production**:
   ```bash
   # Build production image
   docker build -t zetify-d2p2:latest .

   # Run with production compose
   docker-compose -f docker-compose.prod.yml up -d
   ```

3. **Kubernetes Deployment**:
   ```bash
   # Apply k8s manifests
   kubectl apply -f k8s/

   # Check deployment status
   kubectl get pods -n zetify
   ```

## 🛠️ Development

### Project Structure

```
zetify-d2p2/
├── src/                     # Source code
│   ├── agents/             # AI agent implementations
│   │   ├── base/           # Base agent class
│   │   ├── classifier/     # Classification agent
│   │   ├── urgency/        # Urgency detection agent
│   │   └── ...             # Other specialized agents
│   ├── services/           # Business logic services
│   ├── utils/              # Utility functions
│   ├── types/              # TypeScript type definitions
│   └── config/             # Configuration files
├── tests/                   # Test suites
│   ├── unit/               # Unit tests
│   ├── integration/        # Integration tests
│   └── performance/        # Performance tests
├── docs/                    # Documentation
│   ├── zetify-specification.md
│   ├── zetify-architecture.md
│   └── zetify-pseudocode.md
├── monitoring/             # Monitoring configurations
├── k8s/                    # Kubernetes manifests
└── docker-compose.yml      # Docker composition
```

### Adding New Agents

1. **Create Agent Class**:
   ```typescript
   // src/agents/custom/CustomAgent.ts
   import { BaseAgent } from '../base/BaseAgent';

   export class CustomAgent extends BaseAgent<InputType, OutputType> {
     protected async process(input: InputType): Promise<{
       confidence: number;
       data: OutputType;
       reasoning: string;
     }> {
       // Your agent logic here
     }
   }
   ```

2. **Register Agent**:
   ```typescript
   // src/config/agents.ts
   import { CustomAgent } from '../agents/custom/CustomAgent';

   export const agentRegistry = {
     custom: CustomAgent,
     // ... other agents
   };
   ```

3. **Add Tests**:
   ```typescript
   // tests/agents/CustomAgent.test.ts
   describe('CustomAgent', () => {
     // Your test cases
   });
   ```

## 📋 API Reference

### Email Processing API

#### Process Single Email
```http
POST /api/v1/emails/process
Content-Type: application/json
Authorization: Bearer <token>

{
  "from": "string",
  "to": ["string"],
  "subject": "string",
  "body_text": "string",
  "body_html": "string (optional)",
  "attachments": [
    {
      "filename": "string",
      "content_type": "string",
      "content": "base64-encoded-content"
    }
  ]
}
```

**Response:**
```json
{
  "workflow_id": "uuid",
  "status": "completed|processing|failed",
  "routing": {
    "department": "support|sales|hr|legal|finance|ops",
    "mailbox": "support@company.com",
    "confidence": 0.85
  },
  "classification": {
    "intent": "support",
    "urgency": "high",
    "sla_hours": 1
  },
  "context": {
    "sender_info": {...},
    "related_tickets": [...],
    "account_info": {...}
  },
  "processing_time_ms": 1250,
  "timestamp": "2024-01-15T10:30:00Z"
}
```

## 🔧 Troubleshooting

### Common Issues

#### 1. Email Connection Issues
```bash
# Test IMAP connection
npm run test:imap

# Check logs
docker logs zetify-d2p2-app

# Verify credentials
curl -X POST http://localhost:3000/api/v1/email/test-connection
```

#### 2. Agent Timeout Errors
```bash
# Increase timeout in config
export AGENT_TIMEOUT_MS=60000

# Check model API status
curl -X GET https://api.openai.com/v1/models

# Review agent logs
tail -f logs/agents.log
```

#### 3. Database Connection Issues
```bash
# Test database connections
npm run test:db

# Reset databases
docker-compose down -v
docker-compose up -d
```

### Getting Help

- **Documentation**: Check the `docs/` directory for detailed guides
- **Issues**: Report bugs at GitHub Issues
- **Support**: Email support@yourcompany.com

## 📄 License

This project is licensed under the MIT License.

## 🙏 Acknowledgments

- **SPARC Methodology**: Systematic development approach
- **Claude Flow**: Agent orchestration framework
- **OpenAI & Anthropic**: AI model providers
- **LangChain**: Agent framework components

---

**Built with ❤️ by the Zetify Team**

*Transforming email chaos into intelligent workflows, one agent at a time.*