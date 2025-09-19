import { z } from 'zod';
export declare const EmailProviderConfigSchema: z.ZodObject<{
    type: z.ZodEnum<["imap", "pop3", "exchange", "gmail"]>;
    host: z.ZodString;
    port: z.ZodNumber;
    secure: z.ZodBoolean;
    auth: z.ZodObject<{
        user: z.ZodString;
        pass: z.ZodString;
    }, "strip", z.ZodTypeAny, {
        user: string;
        pass: string;
    }, {
        user: string;
        pass: string;
    }>;
    options: z.ZodOptional<z.ZodRecord<z.ZodString, z.ZodUnknown>>;
}, "strip", z.ZodTypeAny, {
    type: "imap" | "pop3" | "exchange" | "gmail";
    host: string;
    port: number;
    secure: boolean;
    auth: {
        user: string;
        pass: string;
    };
    options?: Record<string, unknown> | undefined;
}, {
    type: "imap" | "pop3" | "exchange" | "gmail";
    host: string;
    port: number;
    secure: boolean;
    auth: {
        user: string;
        pass: string;
    };
    options?: Record<string, unknown> | undefined;
}>;
export declare const AgentConfigSchema: z.ZodObject<{
    id: z.ZodString;
    name: z.ZodString;
    description: z.ZodString;
    capabilities: z.ZodArray<z.ZodObject<{
        name: z.ZodString;
        description: z.ZodString;
        confidence: z.ZodNumber;
        parameters: z.ZodOptional<z.ZodRecord<z.ZodString, z.ZodUnknown>>;
    }, "strip", z.ZodTypeAny, {
        confidence: number;
        name: string;
        description: string;
        parameters?: Record<string, unknown> | undefined;
    }, {
        confidence: number;
        name: string;
        description: string;
        parameters?: Record<string, unknown> | undefined;
    }>, "many">;
    priority: z.ZodNumber;
    enabled: z.ZodBoolean;
    maxConcurrentTasks: z.ZodNumber;
    timeout: z.ZodNumber;
    retryAttempts: z.ZodNumber;
    dependencies: z.ZodArray<z.ZodString, "many">;
    parameters: z.ZodRecord<z.ZodString, z.ZodUnknown>;
}, "strip", z.ZodTypeAny, {
    id: string;
    name: string;
    description: string;
    capabilities: {
        confidence: number;
        name: string;
        description: string;
        parameters?: Record<string, unknown> | undefined;
    }[];
    parameters: Record<string, unknown>;
    priority: number;
    enabled: boolean;
    maxConcurrentTasks: number;
    timeout: number;
    retryAttempts: number;
    dependencies: string[];
}, {
    id: string;
    name: string;
    description: string;
    capabilities: {
        confidence: number;
        name: string;
        description: string;
        parameters?: Record<string, unknown> | undefined;
    }[];
    parameters: Record<string, unknown>;
    priority: number;
    enabled: boolean;
    maxConcurrentTasks: number;
    timeout: number;
    retryAttempts: number;
    dependencies: string[];
}>;
export declare const PipelineConfigSchema: z.ZodObject<{
    id: z.ZodString;
    name: z.ZodString;
    description: z.ZodString;
    stages: z.ZodArray<z.ZodObject<{
        id: z.ZodString;
        name: z.ZodString;
        description: z.ZodString;
        agentTypes: z.ZodArray<z.ZodString, "many">;
        required: z.ZodBoolean;
        parallel: z.ZodBoolean;
        retryOnFailure: z.ZodBoolean;
        timeout: z.ZodNumber;
    }, "strip", z.ZodTypeAny, {
        id: string;
        name: string;
        description: string;
        timeout: number;
        agentTypes: string[];
        required: boolean;
        parallel: boolean;
        retryOnFailure: boolean;
    }, {
        id: string;
        name: string;
        description: string;
        timeout: number;
        agentTypes: string[];
        required: boolean;
        parallel: boolean;
        retryOnFailure: boolean;
    }>, "many">;
    globalTimeout: z.ZodNumber;
    failureStrategy: z.ZodEnum<["stop", "continue", "retry"]>;
    parallelExecution: z.ZodBoolean;
}, "strip", z.ZodTypeAny, {
    id: string;
    name: string;
    description: string;
    stages: {
        id: string;
        name: string;
        description: string;
        timeout: number;
        agentTypes: string[];
        required: boolean;
        parallel: boolean;
        retryOnFailure: boolean;
    }[];
    globalTimeout: number;
    failureStrategy: "stop" | "continue" | "retry";
    parallelExecution: boolean;
}, {
    id: string;
    name: string;
    description: string;
    stages: {
        id: string;
        name: string;
        description: string;
        timeout: number;
        agentTypes: string[];
        required: boolean;
        parallel: boolean;
        retryOnFailure: boolean;
    }[];
    globalTimeout: number;
    failureStrategy: "stop" | "continue" | "retry";
    parallelExecution: boolean;
}>;
export declare const AppConfigSchema: z.ZodObject<{
    app: z.ZodObject<{
        name: z.ZodDefault<z.ZodString>;
        version: z.ZodDefault<z.ZodString>;
        environment: z.ZodDefault<z.ZodEnum<["development", "staging", "production"]>>;
        logLevel: z.ZodDefault<z.ZodEnum<["debug", "info", "warn", "error"]>>;
        port: z.ZodDefault<z.ZodNumber>;
    }, "strip", z.ZodTypeAny, {
        port: number;
        name: string;
        version: string;
        environment: "development" | "production" | "staging";
        logLevel: "info" | "error" | "debug" | "warn";
    }, {
        port?: number | undefined;
        name?: string | undefined;
        version?: string | undefined;
        environment?: "development" | "production" | "staging" | undefined;
        logLevel?: "info" | "error" | "debug" | "warn" | undefined;
    }>;
    email: z.ZodObject<{
        type: z.ZodEnum<["imap", "pop3", "exchange", "gmail"]>;
        host: z.ZodString;
        port: z.ZodNumber;
        secure: z.ZodBoolean;
        auth: z.ZodObject<{
            user: z.ZodString;
            pass: z.ZodString;
        }, "strip", z.ZodTypeAny, {
            user: string;
            pass: string;
        }, {
            user: string;
            pass: string;
        }>;
        options: z.ZodOptional<z.ZodRecord<z.ZodString, z.ZodUnknown>>;
    }, "strip", z.ZodTypeAny, {
        type: "imap" | "pop3" | "exchange" | "gmail";
        host: string;
        port: number;
        secure: boolean;
        auth: {
            user: string;
            pass: string;
        };
        options?: Record<string, unknown> | undefined;
    }, {
        type: "imap" | "pop3" | "exchange" | "gmail";
        host: string;
        port: number;
        secure: boolean;
        auth: {
            user: string;
            pass: string;
        };
        options?: Record<string, unknown> | undefined;
    }>;
    database: z.ZodObject<{
        type: z.ZodEnum<["sqlite", "postgresql", "mysql"]>;
        host: z.ZodOptional<z.ZodString>;
        port: z.ZodOptional<z.ZodNumber>;
        database: z.ZodString;
        username: z.ZodOptional<z.ZodString>;
        password: z.ZodOptional<z.ZodString>;
        ssl: z.ZodDefault<z.ZodBoolean>;
        poolSize: z.ZodDefault<z.ZodNumber>;
    }, "strip", z.ZodTypeAny, {
        type: "sqlite" | "postgresql" | "mysql";
        database: string;
        ssl: boolean;
        poolSize: number;
        host?: string | undefined;
        port?: number | undefined;
        username?: string | undefined;
        password?: string | undefined;
    }, {
        type: "sqlite" | "postgresql" | "mysql";
        database: string;
        host?: string | undefined;
        port?: number | undefined;
        username?: string | undefined;
        password?: string | undefined;
        ssl?: boolean | undefined;
        poolSize?: number | undefined;
    }>;
    redis: z.ZodOptional<z.ZodObject<{
        host: z.ZodDefault<z.ZodString>;
        port: z.ZodDefault<z.ZodNumber>;
        password: z.ZodOptional<z.ZodString>;
        db: z.ZodDefault<z.ZodNumber>;
    }, "strip", z.ZodTypeAny, {
        host: string;
        port: number;
        db: number;
        password?: string | undefined;
    }, {
        host?: string | undefined;
        port?: number | undefined;
        password?: string | undefined;
        db?: number | undefined;
    }>>;
    agents: z.ZodArray<z.ZodObject<{
        id: z.ZodString;
        name: z.ZodString;
        description: z.ZodString;
        capabilities: z.ZodArray<z.ZodObject<{
            name: z.ZodString;
            description: z.ZodString;
            confidence: z.ZodNumber;
            parameters: z.ZodOptional<z.ZodRecord<z.ZodString, z.ZodUnknown>>;
        }, "strip", z.ZodTypeAny, {
            confidence: number;
            name: string;
            description: string;
            parameters?: Record<string, unknown> | undefined;
        }, {
            confidence: number;
            name: string;
            description: string;
            parameters?: Record<string, unknown> | undefined;
        }>, "many">;
        priority: z.ZodNumber;
        enabled: z.ZodBoolean;
        maxConcurrentTasks: z.ZodNumber;
        timeout: z.ZodNumber;
        retryAttempts: z.ZodNumber;
        dependencies: z.ZodArray<z.ZodString, "many">;
        parameters: z.ZodRecord<z.ZodString, z.ZodUnknown>;
    }, "strip", z.ZodTypeAny, {
        id: string;
        name: string;
        description: string;
        capabilities: {
            confidence: number;
            name: string;
            description: string;
            parameters?: Record<string, unknown> | undefined;
        }[];
        parameters: Record<string, unknown>;
        priority: number;
        enabled: boolean;
        maxConcurrentTasks: number;
        timeout: number;
        retryAttempts: number;
        dependencies: string[];
    }, {
        id: string;
        name: string;
        description: string;
        capabilities: {
            confidence: number;
            name: string;
            description: string;
            parameters?: Record<string, unknown> | undefined;
        }[];
        parameters: Record<string, unknown>;
        priority: number;
        enabled: boolean;
        maxConcurrentTasks: number;
        timeout: number;
        retryAttempts: number;
        dependencies: string[];
    }>, "many">;
    pipelines: z.ZodArray<z.ZodObject<{
        id: z.ZodString;
        name: z.ZodString;
        description: z.ZodString;
        stages: z.ZodArray<z.ZodObject<{
            id: z.ZodString;
            name: z.ZodString;
            description: z.ZodString;
            agentTypes: z.ZodArray<z.ZodString, "many">;
            required: z.ZodBoolean;
            parallel: z.ZodBoolean;
            retryOnFailure: z.ZodBoolean;
            timeout: z.ZodNumber;
        }, "strip", z.ZodTypeAny, {
            id: string;
            name: string;
            description: string;
            timeout: number;
            agentTypes: string[];
            required: boolean;
            parallel: boolean;
            retryOnFailure: boolean;
        }, {
            id: string;
            name: string;
            description: string;
            timeout: number;
            agentTypes: string[];
            required: boolean;
            parallel: boolean;
            retryOnFailure: boolean;
        }>, "many">;
        globalTimeout: z.ZodNumber;
        failureStrategy: z.ZodEnum<["stop", "continue", "retry"]>;
        parallelExecution: z.ZodBoolean;
    }, "strip", z.ZodTypeAny, {
        id: string;
        name: string;
        description: string;
        stages: {
            id: string;
            name: string;
            description: string;
            timeout: number;
            agentTypes: string[];
            required: boolean;
            parallel: boolean;
            retryOnFailure: boolean;
        }[];
        globalTimeout: number;
        failureStrategy: "stop" | "continue" | "retry";
        parallelExecution: boolean;
    }, {
        id: string;
        name: string;
        description: string;
        stages: {
            id: string;
            name: string;
            description: string;
            timeout: number;
            agentTypes: string[];
            required: boolean;
            parallel: boolean;
            retryOnFailure: boolean;
        }[];
        globalTimeout: number;
        failureStrategy: "stop" | "continue" | "retry";
        parallelExecution: boolean;
    }>, "many">;
    security: z.ZodObject<{
        jwtSecret: z.ZodString;
        bcryptRounds: z.ZodDefault<z.ZodNumber>;
        sessionTimeout: z.ZodDefault<z.ZodNumber>;
        maxLoginAttempts: z.ZodDefault<z.ZodNumber>;
    }, "strip", z.ZodTypeAny, {
        jwtSecret: string;
        bcryptRounds: number;
        sessionTimeout: number;
        maxLoginAttempts: number;
    }, {
        jwtSecret: string;
        bcryptRounds?: number | undefined;
        sessionTimeout?: number | undefined;
        maxLoginAttempts?: number | undefined;
    }>;
    monitoring: z.ZodObject<{
        enabled: z.ZodDefault<z.ZodBoolean>;
        metricsInterval: z.ZodDefault<z.ZodNumber>;
        healthCheckInterval: z.ZodDefault<z.ZodNumber>;
        alertThresholds: z.ZodObject<{
            errorRate: z.ZodDefault<z.ZodNumber>;
            responseTime: z.ZodDefault<z.ZodNumber>;
            memoryUsage: z.ZodDefault<z.ZodNumber>;
        }, "strip", z.ZodTypeAny, {
            errorRate: number;
            responseTime: number;
            memoryUsage: number;
        }, {
            errorRate?: number | undefined;
            responseTime?: number | undefined;
            memoryUsage?: number | undefined;
        }>;
    }, "strip", z.ZodTypeAny, {
        enabled: boolean;
        metricsInterval: number;
        healthCheckInterval: number;
        alertThresholds: {
            errorRate: number;
            responseTime: number;
            memoryUsage: number;
        };
    }, {
        alertThresholds: {
            errorRate?: number | undefined;
            responseTime?: number | undefined;
            memoryUsage?: number | undefined;
        };
        enabled?: boolean | undefined;
        metricsInterval?: number | undefined;
        healthCheckInterval?: number | undefined;
    }>;
}, "strip", z.ZodTypeAny, {
    email: {
        type: "imap" | "pop3" | "exchange" | "gmail";
        host: string;
        port: number;
        secure: boolean;
        auth: {
            user: string;
            pass: string;
        };
        options?: Record<string, unknown> | undefined;
    };
    app: {
        port: number;
        name: string;
        version: string;
        environment: "development" | "production" | "staging";
        logLevel: "info" | "error" | "debug" | "warn";
    };
    database: {
        type: "sqlite" | "postgresql" | "mysql";
        database: string;
        ssl: boolean;
        poolSize: number;
        host?: string | undefined;
        port?: number | undefined;
        username?: string | undefined;
        password?: string | undefined;
    };
    agents: {
        id: string;
        name: string;
        description: string;
        capabilities: {
            confidence: number;
            name: string;
            description: string;
            parameters?: Record<string, unknown> | undefined;
        }[];
        parameters: Record<string, unknown>;
        priority: number;
        enabled: boolean;
        maxConcurrentTasks: number;
        timeout: number;
        retryAttempts: number;
        dependencies: string[];
    }[];
    pipelines: {
        id: string;
        name: string;
        description: string;
        stages: {
            id: string;
            name: string;
            description: string;
            timeout: number;
            agentTypes: string[];
            required: boolean;
            parallel: boolean;
            retryOnFailure: boolean;
        }[];
        globalTimeout: number;
        failureStrategy: "stop" | "continue" | "retry";
        parallelExecution: boolean;
    }[];
    security: {
        jwtSecret: string;
        bcryptRounds: number;
        sessionTimeout: number;
        maxLoginAttempts: number;
    };
    monitoring: {
        enabled: boolean;
        metricsInterval: number;
        healthCheckInterval: number;
        alertThresholds: {
            errorRate: number;
            responseTime: number;
            memoryUsage: number;
        };
    };
    redis?: {
        host: string;
        port: number;
        db: number;
        password?: string | undefined;
    } | undefined;
}, {
    email: {
        type: "imap" | "pop3" | "exchange" | "gmail";
        host: string;
        port: number;
        secure: boolean;
        auth: {
            user: string;
            pass: string;
        };
        options?: Record<string, unknown> | undefined;
    };
    app: {
        port?: number | undefined;
        name?: string | undefined;
        version?: string | undefined;
        environment?: "development" | "production" | "staging" | undefined;
        logLevel?: "info" | "error" | "debug" | "warn" | undefined;
    };
    database: {
        type: "sqlite" | "postgresql" | "mysql";
        database: string;
        host?: string | undefined;
        port?: number | undefined;
        username?: string | undefined;
        password?: string | undefined;
        ssl?: boolean | undefined;
        poolSize?: number | undefined;
    };
    agents: {
        id: string;
        name: string;
        description: string;
        capabilities: {
            confidence: number;
            name: string;
            description: string;
            parameters?: Record<string, unknown> | undefined;
        }[];
        parameters: Record<string, unknown>;
        priority: number;
        enabled: boolean;
        maxConcurrentTasks: number;
        timeout: number;
        retryAttempts: number;
        dependencies: string[];
    }[];
    pipelines: {
        id: string;
        name: string;
        description: string;
        stages: {
            id: string;
            name: string;
            description: string;
            timeout: number;
            agentTypes: string[];
            required: boolean;
            parallel: boolean;
            retryOnFailure: boolean;
        }[];
        globalTimeout: number;
        failureStrategy: "stop" | "continue" | "retry";
        parallelExecution: boolean;
    }[];
    security: {
        jwtSecret: string;
        bcryptRounds?: number | undefined;
        sessionTimeout?: number | undefined;
        maxLoginAttempts?: number | undefined;
    };
    monitoring: {
        alertThresholds: {
            errorRate?: number | undefined;
            responseTime?: number | undefined;
            memoryUsage?: number | undefined;
        };
        enabled?: boolean | undefined;
        metricsInterval?: number | undefined;
        healthCheckInterval?: number | undefined;
    };
    redis?: {
        host?: string | undefined;
        port?: number | undefined;
        password?: string | undefined;
        db?: number | undefined;
    } | undefined;
}>;
export type AppConfig = z.infer<typeof AppConfigSchema>;
export type EmailProviderConfig = z.infer<typeof EmailProviderConfigSchema>;
export type AgentConfig = z.infer<typeof AgentConfigSchema>;
export type PipelineConfig = z.infer<typeof PipelineConfigSchema>;
export declare class Configuration {
    private logger;
    private config;
    private configPath;
    constructor();
    initialize(): Promise<void>;
    getConfig(): AppConfig;
    getEmailConfig(): EmailProviderConfig;
    getAgentConfigs(): AgentConfig[];
    getPipelineConfigs(): PipelineConfig[];
    getEnvironment(): string;
    isDevelopment(): boolean;
    isProduction(): boolean;
    private loadConfiguration;
    private loadConfigurationFromFile;
    private getDefaultConfiguration;
    private mergeConfigurations;
    private applyEnvironmentOverrides;
}
//# sourceMappingURL=Configuration.d.ts.map