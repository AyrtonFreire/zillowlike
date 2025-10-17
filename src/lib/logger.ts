/**
 * Logging estruturado para a aplicação
 * 
 * Usage:
 * import { logger } from '@/lib/logger';
 * logger.info('User logged in', { userId: '123' });
 * logger.error('Failed to process lead', { leadId: '456', error });
 */

interface LogContext {
  [key: string]: any;
}

type LogLevel = "debug" | "info" | "warn" | "error";

class Logger {
  private isDevelopment = process.env.NODE_ENV === "development";
  private requestId?: string;

  setRequestId(id: string) {
    this.requestId = id;
  }

  clearRequestId() {
    this.requestId = undefined;
  }

  private log(level: LogLevel, message: string, context?: LogContext) {
    const timestamp = new Date().toISOString();
    const logEntry = {
      timestamp,
      level,
      message,
      ...(this.requestId && { requestId: this.requestId }),
      ...context,
    };

    if (this.isDevelopment) {
      // Pretty print em desenvolvimento
      const emoji = {
        debug: "🔍",
        info: "ℹ️",
        warn: "⚠️",
        error: "❌",
      };
      console.log(
        `${emoji[level]} [${level.toUpperCase()}] ${message}`,
        context || ""
      );
    } else {
      // JSON estruturado em produção (para ingestão por ferramentas)
      console.log(JSON.stringify(logEntry));
    }

    // Em produção, enviar para Sentry
    if (!this.isDevelopment && level === "error") {
      try {
        const Sentry = require("@sentry/nextjs");
        Sentry.captureException(context?.error || new Error(message), {
          extra: context,
          level: "error",
        });
      } catch (err) {
        // Sentry não configurado ou erro ao enviar
        console.error("Failed to send to Sentry:", err);
      }
    }
  }

  debug(message: string, context?: LogContext) {
    this.log("debug", message, context);
  }

  info(message: string, context?: LogContext) {
    this.log("info", message, context);
  }

  warn(message: string, context?: LogContext) {
    this.log("warn", message, context);
  }

  error(message: string, context?: LogContext) {
    this.log("error", message, context);
  }
}

// Export singleton
export const logger = new Logger();

/**
 * Helper para gerar request IDs
 */
export function generateRequestId(): string {
  return `req_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
}

/**
 * Middleware helper para adicionar request ID
 */
export function withRequestId<T extends any[], R>(
  handler: (...args: T) => Promise<R>
) {
  return async (...args: T): Promise<R> => {
    const requestId = generateRequestId();
    logger.setRequestId(requestId);
    
    try {
      return await handler(...args);
    } finally {
      logger.clearRequestId();
    }
  };
}
