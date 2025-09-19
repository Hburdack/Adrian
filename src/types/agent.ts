export interface AgentCapability {
  name: string;
  description: string;
  confidence: number;
  parameters?: Record<string, any>;
}

export interface AgentMetrics {
  totalProcessed: number;
  successRate: number;
  averageProcessingTime: number;
  lastActivity: Date;
  errorCount: number;
}

export interface AgentConfiguration {
  id: string;
  name: string;
  description: string;
  capabilities: AgentCapability[];
  priority: number;
  enabled: boolean;
  maxConcurrentTasks: number;
  timeout: number;
  retryAttempts: number;
  dependencies: string[];
  parameters: Record<string, any>;
}

export interface AgentExecutionContext {
  taskId: string;
  agentId: string;
  startTime: Date;
  timeout: number;
  metadata: Record<string, any>;
}

export interface AgentResult<T = any> {
  success: boolean;
  data?: T;
  error?: Error;
  confidence: number;
  processingTime: number;
  metadata: Record<string, any>;
}

export interface AgentTask<TInput = any, TOutput = any> {
  id: string;
  type: string;
  input: TInput;
  priority: number;
  createdAt: Date;
  scheduledAt?: Date;
  maxRetries: number;
  currentRetries: number;
  timeout: number;
  dependencies: string[];
  metadata: Record<string, any>;
  result?: AgentResult<TOutput>;
}

export const AgentStatus = {
  IDLE: 'idle' as const,
  BUSY: 'busy' as const,
  ERROR: 'error' as const,
  DISABLED: 'disabled' as const
} as const;

export type AgentStatus = typeof AgentStatus[keyof typeof AgentStatus];

export const TaskStatus = {
  PENDING: 'pending' as const,
  RUNNING: 'running' as const,
  COMPLETED: 'completed' as const,
  FAILED: 'failed' as const,
  CANCELLED: 'cancelled' as const,
  RETRYING: 'retrying' as const
} as const;

export type TaskStatus = typeof TaskStatus[keyof typeof TaskStatus];