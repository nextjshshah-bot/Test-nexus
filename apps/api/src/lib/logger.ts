import { env } from '../config/env';

type Level = 'debug' | 'info' | 'warn' | 'error';

const LEVEL_WEIGHT: Record<Level, number> = { debug: 10, info: 20, warn: 30, error: 40 };

const configuredLevel = ((): Level => {
  const raw = env.logLevel.toLowerCase();
  return (['debug', 'info', 'warn', 'error'] as Level[]).includes(raw as Level) ? (raw as Level) : 'info';
})();

function serialise(value: unknown): string {
  if (value instanceof Error) {
    return JSON.stringify({ name: value.name, message: value.message, stack: value.stack });
  }
  if (typeof value === 'string') return value;
  try {
    return JSON.stringify(value);
  } catch {
    return String(value);
  }
}

/**
 * Zero-dependency structured logger. Emits single-line JSON in production so
 * Railway's log explorer can index fields, and human-friendly text locally.
 */
class Logger {
  private readonly context: string;

  constructor(context = 'app') {
    this.context = context;
  }

  child(context: string): Logger {
    return new Logger(`${this.context}:${context}`);
  }

  private write(level: Level, message: string, meta?: unknown): void {
    if (LEVEL_WEIGHT[level] < LEVEL_WEIGHT[configuredLevel]) return;

    const timestamp = new Date().toISOString();
    const levelLabel = level.toUpperCase().padEnd(5);

    if (env.isProduction) {
      const payload: Record<string, unknown> = { timestamp, level: levelLabel.trim(), context: this.context, message };
      if (meta !== undefined) payload.meta = meta;
      process.stdout.write(`${JSON.stringify(payload)}\n`);
      return;
    }

    const metaSuffix = meta === undefined ? '' : ` ${serialise(meta)}`;
    process.stdout.write(`${timestamp} ${levelLabel} [${this.context}] ${message}${metaSuffix}\n`);
  }

  debug(message: string, meta?: unknown): void {
    this.write('debug', message, meta);
  }

  info(message: string, meta?: unknown): void {
    this.write('info', message, meta);
  }

  warn(message: string, meta?: unknown): void {
    this.write('warn', message, meta);
  }

  error(message: string, meta?: unknown): void {
    this.write('error', message, meta);
  }
}

export const logger = new Logger('nexuscore');
export default logger;
