import { describe, it, expect } from 'vitest';

import logger from './logger';

describe('lib/logger', () => {
  it('should have log, warn, error, debug, info methods', () => {
    expect(typeof logger.log).toBe('function');
    expect(typeof logger.warn).toBe('function');
    expect(typeof logger.error).toBe('function');
    expect(typeof logger.debug).toBe('function');
    expect(typeof logger.info).toBe('function');
  });

  it('should not throw when calling methods', () => {
    expect(() => logger.log('test')).not.toThrow();
    expect(() => logger.warn('test')).not.toThrow();
    expect(() => logger.error('test')).not.toThrow();
    expect(() => logger.debug('test')).not.toThrow();
    expect(() => logger.info('test')).not.toThrow();
  });
});
