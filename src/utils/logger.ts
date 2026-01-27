/**
 * Simple logging utility for development and debugging
 */

type LogLevel = 'debug' | 'info' | 'warn' | 'error';

const logLevelColors: Record<LogLevel, string> = {
  debug: '\x1b[36m', // cyan
  info: '\x1b[32m',  // green
  warn: '\x1b[33m',  // yellow
  error: '\x1b[31m', // red
};

const reset = '\x1b[0m';

export const logger = {
  debug: (message: string, ...args: any[]) => {
    console.log(`${logLevelColors.debug}[DEBUG]${reset}`, message, ...args);
  },

  info: (message: string, ...args: any[]) => {
    console.log(`${logLevelColors.info}[INFO]${reset}`, message, ...args);
  },

  warn: (message: string, ...args: any[]) => {
    console.warn(`${logLevelColors.warn}[WARN]${reset}`, message, ...args);
  },

  error: (message: string, ...args: any[]) => {
    console.error(`${logLevelColors.error}[ERROR]${reset}`, message, ...args);
  },
};
