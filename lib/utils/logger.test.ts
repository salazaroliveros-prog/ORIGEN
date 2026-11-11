import { describe, it, expect, beforeEach, afterEach } from 'vitest';

import { logger, createLogger } from './logger';

describe('lib/utils/logger', () => {
  beforeEach(() => {
    logger.clear();
    logger.setMinLevel('debug');
  });

  afterEach(() => {
    logger.clear();
    logger.setMinLevel('info');
  });

  describe('Logger class', () => {
    it('should log info messages', () => {
      logger.info('test-module', 'test message');
      const logs = logger.getLogs();
      expect(logs.length).toBe(1);
      expect(logs[0].level).toBe('info');
      expect(logs[0].module).toBe('test-module');
      expect(logs[0].message).toBe('test message');
    });

    it('should log error messages with error object', () => {
      const err = new Error('test error');
      logger.error('test-module', 'error happened', err);
      const logs = logger.getLogs('error');
      expect(logs.length).toBe(1);
      expect(logs[0].error).toBe(err);
    });

    it('should filter by log level', () => {
      logger.debug('mod', 'debug msg');
      logger.info('mod', 'info msg');
      logger.warn('mod', 'warn msg');
      logger.error('mod', 'error msg');

      expect(logger.getLogs('error').length).toBe(1);
      expect(logger.getLogs('warn').length).toBe(1);
      expect(logger.getLogs('info').length).toBe(1);
      expect(logger.getLogs('debug').length).toBe(1);
      expect(logger.getLogs().length).toBe(4);
    });

    it('should filter by module', () => {
      logger.info('mod-a', 'msg a');
      logger.info('mod-b', 'msg b');
      expect(logger.getLogs(undefined, 'mod-a').length).toBe(1);
      expect(logger.getLogs(undefined, 'mod-b').length).toBe(1);
    });

    it('should clear logs', () => {
      logger.info('mod', 'msg');
      expect(logger.getLogs().length).toBe(1);
      logger.clear();
      expect(logger.getLogs().length).toBe(0);
    });

    it('should export logs as JSON', () => {
      logger.info('mod', 'test');
      const json = logger.exportJSON();
      const parsed = JSON.parse(json);
      expect(parsed.length).toBe(1);
      expect(parsed[0].message).toBe('test');
    });

    it('should set minimum log level', () => {
      logger.setMinLevel('warn');
      logger.debug('mod', 'debug');
      logger.info('mod', 'info');
      logger.warn('mod', 'warn');
      logger.error('mod', 'error');

      expect(logger.getLogs('debug').length).toBe(0);
      expect(logger.getLogs('info').length).toBe(0);
      expect(logger.getLogs('warn').length).toBe(1);
      expect(logger.getLogs('error').length).toBe(1);
    });

    it('should respect maxLogs limit', () => {
      for (let i = 0; i < 10; i++) {
        logger.info('mod', `msg ${i}`);
      }
      expect(logger.getLogs().length).toBe(10);
    });
  });

  describe('createLogger', () => {
    it('should create scoped logger with all methods', () => {
      const scoped = createLogger('scoped-module');
      expect(typeof scoped.debug).toBe('function');
      expect(typeof scoped.info).toBe('function');
      expect(typeof scoped.warn).toBe('function');
      expect(typeof scoped.error).toBe('function');
    });

    it('should log with module name', () => {
      const scoped = createLogger('my-module');
      scoped.info('hello');
      const logs = logger.getLogs(undefined, 'my-module');
      expect(logs.length).toBe(1);
      expect(logs[0].message).toBe('hello');
    });

    it('should pass data to logger', () => {
      const scoped = createLogger('my-module');
      scoped.error('failed', new Error('boom'), { code: 500 });
      const logs = logger.getLogs('error');
      expect(logs[0].data).toEqual({ code: 500 });
      expect(logs[0].error).toBeInstanceOf(Error);
    });
  });
});
