/**
 * Interface defining the structure of worker configuration
 */
export interface WorkerConfiguration {
  /**
   * The name of the worker script
   */
  name: string;

  /**
   * The entry point module for the worker
   */
  main: string;

  /**
   * Compatibility date for the worker runtime
   */
  compatibility_date?: string;

  /**
   * Compatibility flags for the worker runtime
   */
  compatibility_flags?: string[];

  /**
   * Environment variables for the worker
   */
  vars?: Record<string, string | number | boolean>;

  /**
   * Trigger definitions for the worker
   */
  triggers?: {
    crons: string[];
  };

  /**
   * Usage limits for the worker
   */
  limits?: {
    cpu_ms: number;
  };

  /**
   * Definition of connected external services
   */
  services?: Record<string, {
    service: string;
    environment?: string;
  }>;
}

/**
 * Type for environment-specific overrides
 */
export type Environment = Omit<WorkerConfiguration, 'name' | 'main'>;

/**
 * Main configuration type
 */
export type Config = WorkerConfiguration & {
  /**
   * Environment-specific configurations
   */
  env?: Record<string, Environment>;
};
