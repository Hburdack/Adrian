import type { EmailContext } from './email.js';
import type { AgentResult } from './agent.js';

export interface PipelineStage {
  id: string;
  name: string;
  description: string;
  agentTypes: string[];
  required: boolean;
  parallel: boolean;
  retryOnFailure: boolean;
  timeout: number;
  condition?: (context: EmailContext) => boolean;
}

export interface PipelineConfiguration {
  id: string;
  name: string;
  description: string;
  stages: PipelineStage[];
  globalTimeout: number;
  failureStrategy: 'stop' | 'continue' | 'retry';
  parallelExecution: boolean;
}

export interface PipelineExecution {
  id: string;
  pipelineId: string;
  emailId: string;
  startTime: Date;
  endTime?: Date;
  status: PipelineStatus;
  currentStage?: string;
  completedStages: string[];
  failedStages: string[];
  results: Map<string, AgentResult>;
  errors: PipelineError[];
  metadata: Record<string, any>;
}

export const PipelineStatus = {
  INITIALIZED: 'initialized' as const,
  RUNNING: 'running' as const,
  COMPLETED: 'completed' as const,
  FAILED: 'failed' as const,
  CANCELLED: 'cancelled' as const,
  PAUSED: 'paused' as const
} as const;

export type PipelineStatus = typeof PipelineStatus[keyof typeof PipelineStatus];

export interface PipelineError {
  stage: string;
  agent?: string;
  error: Error;
  timestamp: Date;
  recoverable: boolean;
}

export interface PipelineContext extends EmailContext {
  execution: PipelineExecution;
  currentStage: PipelineStage;
  previousResults: Map<string, AgentResult>;
  configuration: PipelineConfiguration;
}

export interface TriageResult {
  category: string;
  priority: 'low' | 'normal' | 'high' | 'urgent';
  confidence: number;
  suggestedActions: string[];
  assignedTo?: string;
  estimatedResponseTime?: number;
  requiresHumanReview: boolean;
  metadata: Record<string, any>;
}

export interface ProcessingResult {
  triage: TriageResult;
  response?: {
    subject: string;
    body: string;
    template?: string;
  };
  actions: ProcessedAction[];
  forwardTo?: string[];
  tags: string[];
  confidence: number;
}

export interface ProcessedAction {
  type: 'reply' | 'forward' | 'escalate' | 'archive' | 'flag' | 'schedule';
  parameters: Record<string, any>;
  confidence: number;
  automated: boolean;
}