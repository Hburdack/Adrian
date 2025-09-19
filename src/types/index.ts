// Zetify D2P2 Type Definitions

export interface Email {
  id: string;
  from: string;
  to: string[];
  cc?: string[];
  bcc?: string[];
  subject: string;
  body_text: string;
  body_html?: string;
  attachments: EmailAttachment[];
  timestamp: Date;
  message_id: string;
  thread_id?: string;
  headers: Record<string, string>;
  raw_content?: string;
}

export interface EmailAttachment {
  id: string;
  filename: string;
  content_type: string;
  size: number;
  content?: Buffer;
  extracted_text?: string;
  is_safe: boolean;
}

export interface ProcessedEmail extends Email {
  normalized_content: string;
  pii_tokens: PIIToken[];
  extracted_entities: Entity[];
  processing_metadata: ProcessingMetadata;
}

export interface PIIToken {
  original: string;
  token: string;
  type: 'email' | 'phone' | 'ssn' | 'credit_card' | 'name' | 'address';
  confidence: number;
}

export interface Entity {
  text: string;
  type: string;
  confidence: number;
  start_offset: number;
  end_offset: number;
}

export interface ProcessingMetadata {
  processing_start: Date;
  processing_end?: Date;
  processing_duration_ms?: number;
  agents_involved: string[];
  retry_count: number;
  error_count: number;
}

// Agent System Types
export interface AgentResult<T = any> {
  agent_id: string;
  agent_type: string;
  status: 'success' | 'failure' | 'needs_review';
  confidence: number;
  data: T;
  reasoning: string;
  processing_time_ms: number;
  timestamp: Date;
  metadata?: Record<string, any>;
}

export interface ClassificationResult {
  intent: EmailIntent;
  department: Department;
  confidence: number;
  secondary_intents: EmailIntent[];
  signals: ClassificationSignals;
  reasoning: string;
}

export interface ClassificationSignals {
  is_deadline: boolean;
  is_legal_risk: boolean;
  is_hr_sensitive: boolean;
  is_complaint: boolean;
  is_sales_opportunity: boolean;
  contains_attachment: boolean;
  is_auto_generated: boolean;
}

export interface UrgencyResult {
  urgency_level: UrgencyLevel;
  sla_hours: number;
  deadline_date?: Date;
  urgency_signals: UrgencySignals;
  confidence: number;
}

export interface UrgencySignals {
  has_deadline_keywords: boolean;
  has_urgent_keywords: boolean;
  sender_priority: 'low' | 'medium' | 'high' | 'vip';
  business_hours: boolean;
  weekend_emergency: boolean;
}

export interface ContextResult {
  sender_info: SenderContext;
  related_tickets: RelatedTicket[];
  account_info?: AccountInfo;
  interaction_history: InteractionHistory[];
  enrichment_confidence: number;
}

export interface SenderContext {
  name?: string;
  company?: string;
  role?: string;
  contact_info: ContactInfo;
  relationship_type: 'customer' | 'prospect' | 'partner' | 'vendor' | 'internal' | 'unknown';
  vip_status: boolean;
}

export interface ContactInfo {
  email: string;
  phone?: string;
  linkedin?: string;
  crm_id?: string;
}

export interface RelatedTicket {
  ticket_id: string;
  subject: string;
  status: string;
  created_date: Date;
  last_update: Date;
  priority: string;
  similarity_score: number;
}

export interface AccountInfo {
  account_id: string;
  account_name: string;
  account_tier: string;
  annual_value: number;
  health_score: number;
  last_interaction: Date;
}

export interface InteractionHistory {
  date: Date;
  type: 'email' | 'call' | 'meeting' | 'ticket';
  summary: string;
  outcome: string;
  sentiment: 'positive' | 'neutral' | 'negative';
}

export interface RoutingResult {
  target_department: Department;
  target_mailbox: string;
  routing_confidence: number;
  context_note: string;
  next_actions: string[];
  estimated_resolution_time: number;
}

export interface AssuranceScore {
  overall_confidence: number;
  model_confidence: number;
  consensus_confidence: number;
  context_validation: number;
  policy_compliance: number;
  ambiguity_score: number;
  action: 'accept' | 'retry' | 'escalate';
  retry_strategy?: RetryStrategy;
}

export interface RetryStrategy {
  strategy_type: 'diverse_prompts' | 'alternative_models' | 'ensemble_voting' | 'human_input';
  max_attempts: number;
  confidence_threshold: number;
  timeout_ms: number;
}

export interface EscalationPacket {
  escalation_id: string;
  email_id: string;
  escalation_level: 'low' | 'medium' | 'high' | 'urgent';
  confidence_scores: Record<string, number>;
  agent_results: AgentResult[];
  conflict_summary: string;
  recommended_reviewer: string;
  estimated_review_time: number;
  escalation_reason: string;
  business_impact: string;
}

// Enums
export enum EmailIntent {
  SUPPORT = 'support',
  SALES = 'sales',
  BUSINESS_DEVELOPMENT = 'bd',
  HUMAN_RESOURCES = 'hr',
  PUBLIC_RELATIONS = 'pr',
  LEGAL = 'legal',
  FINANCE = 'finance',
  SPAM = 'spam',
  OTHER = 'other'
}

export enum Department {
  SUPPORT = 'support',
  SALES = 'sales',
  BUSINESS_DEVELOPMENT = 'bd',
  HUMAN_RESOURCES = 'hr',
  PUBLIC_RELATIONS = 'pr',
  LEGAL = 'legal',
  FINANCE = 'finance',
  OPERATIONS = 'ops'
}

export enum UrgencyLevel {
  LOW = 'low',
  MEDIUM = 'medium',
  HIGH = 'high',
  URGENT = 'urgent',
  CRITICAL = 'critical'
}

export enum AgentType {
  CLASSIFIER = 'classifier',
  URGENCY = 'urgency',
  RETRIEVER = 'retriever',
  ROUTER = 'router',
  CRITIQUE = 'critique',
  REFINER = 'refiner',
  ESCALATOR = 'escalator'
}

// Configuration Types
export interface AgentConfig {
  agent_type: AgentType;
  model_provider: 'openai' | 'anthropic' | 'local';
  model_name: string;
  temperature: number;
  max_tokens: number;
  timeout_ms: number;
  retry_attempts: number;
}

export interface WorkflowConfig {
  email_batch_size: number;
  parallel_processing: boolean;
  max_concurrent_agents: number;
  confidence_threshold: number;
  escalation_threshold: number;
  retry_strategies: RetryStrategy[];
}

// Audit and Monitoring Types
export interface AuditLog {
  id: string;
  email_id: string;
  workflow_id: string;
  event_type: string;
  event_data: Record<string, any>;
  timestamp: Date;
  agent_id?: string;
  user_id?: string;
  success: boolean;
  error_message?: string;
}

export interface WorkflowMetrics {
  workflow_id: string;
  email_id: string;
  start_time: Date;
  end_time?: Date;
  total_duration_ms?: number;
  agent_execution_times: Record<string, number>;
  retry_count: number;
  escalation_triggered: boolean;
  final_confidence: number;
  success: boolean;
}

export interface BusinessMetrics {
  date: Date;
  emails_processed: number;
  accuracy_rate: number;
  average_processing_time: number;
  sla_compliance_rate: number;
  escalation_rate: number;
  cost_per_email: number;
  customer_satisfaction: number;
}