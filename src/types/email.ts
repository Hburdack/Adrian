export interface EmailAddress {
  email: string;
  name?: string;
}

export interface EmailAttachment {
  id: string;
  filename: string;
  contentType: string;
  size: number;
  content?: Buffer;
}

export interface EmailMetadata {
  messageId: string;
  threadId?: string;
  references?: string[];
  inReplyTo?: string;
  priority: 'low' | 'normal' | 'high' | 'urgent';
  tags: string[];
  labels: string[];
}

export interface Email {
  id: string;
  from: EmailAddress;
  to: EmailAddress[];
  cc?: EmailAddress[];
  bcc?: EmailAddress[];
  subject: string;
  body: {
    text?: string;
    html?: string;
  };
  attachments: EmailAttachment[];
  receivedAt: Date;
  sentAt: Date;
  metadata: EmailMetadata;
  rawHeaders: Record<string, string>;
}

export interface EmailContext {
  email: Email;
  conversationHistory?: Email[];
  userProfile?: UserProfile;
  organizationContext?: OrganizationContext;
}

export interface UserProfile {
  id: string;
  email: string;
  name: string;
  department?: string;
  role?: string;
  preferences: UserPreferences;
}

export interface UserPreferences {
  autoReply: boolean;
  responseStyle: 'formal' | 'casual' | 'professional';
  priorityKeywords: string[];
  blacklistedSenders: string[];
  whitelistedSenders: string[];
}

export interface OrganizationContext {
  domain: string;
  policies: EmailPolicy[];
  knowledgeBase: KnowledgeBaseEntry[];
  templates: EmailTemplate[];
}

export interface EmailPolicy {
  id: string;
  name: string;
  condition: string;
  action: 'forward' | 'auto_reply' | 'escalate' | 'archive' | 'flag';
  parameters: Record<string, any>;
}

export interface KnowledgeBaseEntry {
  id: string;
  topic: string;
  content: string;
  tags: string[];
  confidence: number;
}

export interface EmailTemplate {
  id: string;
  name: string;
  subject: string;
  body: string;
  variables: string[];
  category: string;
}