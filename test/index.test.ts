import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { afterEach, beforeEach } from 'node:assert';
import type { Env } from '../src/types';

// Мок окружения для тестов
interface MockEnv extends Env {
  RATE_LIMIT_KV: {
    get: vi.Mock;
    put: vi.Mock;
  };
  AI: unknown;
  ASSETS: {
    fetch: vi.Mock;
  };
}

describe('Rate Limiting', () => {
  let env: MockEnv;
  
  beforeEach(() => {
    env = {
      RATE_LIMIT_KV: {
        get: vi.fn(),
        put: vi.fn(),
      },
      AI: {},
      ASSETS: {
        fetch: vi.fn(),
      },
    };
  });

  it('should allow first request', async () => {
    // @ts-ignore - мок для теста
    env.RATE_LIMIT_KV.get.mockResolvedValue(null);
    // @ts-ignore - мок для теста
    env.RATE_LIMIT_KV.put.mockResolvedValue(undefined);

    // Импорт функции после моков
    const { checkRateLimit } = await import('../src/index.ts');
    const result = await checkRateLimit(env, '192.168.1.1');

    expect(result.allowed).toBe(true);
    expect(env.RATE_LIMIT_KV.get).toHaveBeenCalledWith('rate_limit:192.168.1.1');
  });

  it('should deny request when rate limit exceeded', async () => {
    const rateLimitData = JSON.stringify({
      count: 10,
      windowStart: Math.floor(Date.now() / 1000),
    });
    
    // @ts-ignore - мок для теста
    env.RATE_LIMIT_KV.get.mockResolvedValue(rateLimitData);
    // @ts-ignore - мок для теста
    env.RATE_LIMIT_KV.put.mockResolvedValue(undefined);

    // @ts-ignore - мок для теста
    const { checkRateLimit } = await import('../src/index.ts');
    const result = await checkRateLimit(env, '192.168.1.1');

    expect(result.allowed).toBe(false);
    expect(result.resetTime).toBeDefined();
  });
});

describe('Request Validation', () => {
  it('should validate valid request', () => {
    const { validateRequest } = await import('../src/index.ts');
    const result = validateRequest({
      messages: [
        { role: 'user', content: 'Привет' },
        { role: 'assistant', content: 'Здравствуй' },
      ],
    });

    expect(result.valid).toBe(true);
  });

  it('should reject request without messages', () => {
    const { validateRequest } = await import('../src/index.ts');
    const result = validateRequest({});

    expect(result.valid).toBe(false);
    expect(result.error).toBe('Отсутствуют сообщения или неверный формат');
  });

  it('should reject request with too many messages', () => {
    const { validateRequest } = await import('../src/index.ts');
    const messages = Array(51).fill({ role: 'user', content: 'test' });
    const result = validateRequest({ messages });

    expect(result.valid).toBe(false);
    expect(result.error).toBe('Слишком много сообщений в истории (максимум 50)');
  });

  it('should reject request with too long message', () => {
    const { validateRequest } = await import('../src/index.ts');
    const longContent = 'a'.repeat(10001);
    const result = validateRequest({
      messages: [{ role: 'user', content: longContent }],
    });

    expect(result.valid).toBe(false);
    expect(result.error).toBe('Слишком длинное сообщение (максимум 10000 символов)');
  });
});
