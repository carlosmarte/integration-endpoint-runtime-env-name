/**
 * Tests for Environment Name Builder
 */

import createEnvironmentNameBuilder from './index.js';

describe('createEnvironmentNameBuilder', () => {
  describe('Constructor validation', () => {
    test('should create builder with valid conditions', () => {
      const builder = createEnvironmentNameBuilder([
        { check: true, name: 'test' }
      ]);
      expect(builder).toBeDefined();
      expect(typeof builder.evaluate).toBe('function');
    });

    test('should create builder with empty conditions array', () => {
      const builder = createEnvironmentNameBuilder([]);
      expect(builder.evaluate()).toEqual([]);
    });

    test('should throw error if conditions is not an array', () => {
      expect(() => {
        createEnvironmentNameBuilder({ check: true, name: 'test' });
      }).toThrow('Conditions must be an array');
    });

    test('should throw error if condition is not an object', () => {
      expect(() => {
        createEnvironmentNameBuilder([true]);
      }).toThrow('Condition at index 0 must be an object');
    });

    test('should throw error if condition missing check property', () => {
      expect(() => {
        createEnvironmentNameBuilder([{ name: 'test' }]);
      }).toThrow("Condition at index 0 missing required property 'check'");
    });

    test('should throw error if condition missing name property', () => {
      expect(() => {
        createEnvironmentNameBuilder([{ check: true }]);
      }).toThrow("Condition at index 0 missing required property 'name'");
    });

    test('should set default value', () => {
      const defaultVal = [['fallback']];
      const builder = createEnvironmentNameBuilder([], defaultVal);
      expect(builder.defaultValue).toEqual(defaultVal);
    });
  });

  describe('Static boolean conditions', () => {
    test('should return match for single true condition', () => {
      const builder = createEnvironmentNameBuilder([
        { check: true, name: 'always-true' }
      ]);
      expect(builder.evaluate()).toEqual([[true, 'always-true']]);
    });

    test('should return empty array for single false condition', () => {
      const builder = createEnvironmentNameBuilder([
        { check: false, name: 'always-false' }
      ]);
      expect(builder.evaluate()).toEqual([]);
    });

    test('should return all matching conditions', () => {
      const builder = createEnvironmentNameBuilder([
        { check: true, name: 'first' },
        { check: false, name: 'second' },
        { check: true, name: 'third' }
      ]);
      expect(builder.evaluate()).toEqual([
        [true, 'first'],
        [true, 'third']
      ]);
    });

    test('should coerce truthy values to true', () => {
      const builder = createEnvironmentNameBuilder([
        { check: 1, name: 'number' },
        { check: 'string', name: 'string' },
        { check: {}, name: 'object' },
        { check: [], name: 'array' }
      ]);
      expect(builder.evaluate()).toEqual([
        [true, 'number'],
        [true, 'string'],
        [true, 'object'],
        [true, 'array']
      ]);
    });

    test('should coerce falsy values to false', () => {
      const builder = createEnvironmentNameBuilder([
        { check: 0, name: 'zero' },
        { check: '', name: 'empty-string' },
        { check: null, name: 'null' },
        { check: undefined, name: 'undefined' }
      ]);
      expect(builder.evaluate()).toEqual([]);
    });
  });

  describe('Function-based conditions', () => {
    test('should evaluate function returning true', () => {
      const builder = createEnvironmentNameBuilder([
        { check: () => true, name: 'func-true' }
      ]);
      expect(builder.evaluate()).toEqual([[true, 'func-true']]);
    });

    test('should evaluate function returning false', () => {
      const builder = createEnvironmentNameBuilder([
        { check: () => false, name: 'func-false' }
      ]);
      expect(builder.evaluate()).toEqual([]);
    });

    test('should pass context to function', () => {
      const builder = createEnvironmentNameBuilder([
        { check: (ctx) => ctx.test === 'value', name: 'has-test' }
      ]);
      expect(builder.evaluate({ test: 'value' })).toEqual([[true, 'has-test']]);
    });

    test('should access process.env in context', () => {
      process.env.TEST_VAR = 'test-value';
      const builder = createEnvironmentNameBuilder([
        { check: (ctx) => ctx.env.TEST_VAR === 'test-value', name: 'env-check' }
      ]);
      expect(builder.evaluate()).toEqual([[true, 'env-check']]);
      delete process.env.TEST_VAR;
    });

    test('should coerce function return values to boolean', () => {
      const builder = createEnvironmentNameBuilder([
        { check: () => 1, name: 'truthy' },
        { check: () => 0, name: 'falsy' },
        { check: () => 'yes', name: 'string' },
        { check: () => '', name: 'empty' }
      ]);
      expect(builder.evaluate()).toEqual([
        [true, 'truthy'],
        [true, 'string']
      ]);
    });

    test('should handle function errors gracefully', () => {
      const builder = createEnvironmentNameBuilder([
        { check: () => { throw new Error('Test error'); }, name: 'error-func' }
      ]);
      expect(() => builder.evaluate()).toThrow("Error evaluating condition 'error-func': Test error");
    });

    test('should support closure-based conditions', () => {
      const DEBUG = true;
      const FEATURE_FLAG = false;
      const builder = createEnvironmentNameBuilder([
        { check: () => DEBUG, name: 'debug' },
        { check: () => FEATURE_FLAG, name: 'feature' }
      ]);
      expect(builder.evaluate()).toEqual([[true, 'debug']]);
    });
  });

  describe('withContext() method', () => {
    test('should set context and return this for chaining', () => {
      const builder = createEnvironmentNameBuilder([
        { check: (ctx) => ctx.tier === 'premium', name: 'premium' }
      ]);
      const result = builder.withContext({ tier: 'premium' });
      expect(result).toBe(builder); // Check it returns itself
      expect(builder.evaluate()).toEqual([[true, 'premium']]);
    });

    test('should accumulate context from multiple calls', () => {
      const builder = createEnvironmentNameBuilder([
        { check: (ctx) => ctx.tier === 'premium' && ctx.region === 'us', name: 'match' }
      ]);
      builder.withContext({ tier: 'premium' });
      builder.withContext({ region: 'us' });
      expect(builder.evaluate()).toEqual([[true, 'match']]);
    });

    test('should merge overlapping context with later calls winning', () => {
      const builder = createEnvironmentNameBuilder([
        { check: (ctx) => ctx.value === 'second', name: 'check' }
      ]);
      builder.withContext({ value: 'first' });
      builder.withContext({ value: 'second' });
      expect(builder.evaluate()).toEqual([[true, 'check']]);
    });

    test('should handle empty context object', () => {
      const builder = createEnvironmentNameBuilder([
        { check: true, name: 'test' }
      ]);
      builder.withContext({});
      expect(builder.evaluate()).toEqual([[true, 'test']]);
    });

    test('should ignore invalid context types', () => {
      const builder = createEnvironmentNameBuilder([
        { check: (ctx) => ctx.valid === true, name: 'test' }
      ]);
      builder.withContext('invalid');
      builder.withContext(null);
      builder.withContext(undefined);
      builder.withContext([]);
      builder.withContext({ valid: true });
      expect(builder.evaluate()).toEqual([[true, 'test']]);
    });
  });

  describe('Method chaining', () => {
    test('should chain multiple withContext calls', () => {
      const builder = createEnvironmentNameBuilder([
        { check: (ctx) => ctx.a && ctx.b && ctx.c, name: 'all-set' }
      ]);
      const result = builder
        .withContext({ a: true })
        .withContext({ b: true })
        .withContext({ c: true })
        .evaluate();
      expect(result).toEqual([[true, 'all-set']]);
    });

    test('should chain withContext and evaluate', () => {
      const builder = createEnvironmentNameBuilder([
        { check: (ctx) => ctx.tier === 'premium', name: 'premium' }
      ]);
      const result = builder.withContext({ tier: 'premium' }).evaluate();
      expect(result).toEqual([[true, 'premium']]);
    });

    test('should chain resetContext', () => {
      const builder = createEnvironmentNameBuilder([
        { check: (ctx) => ctx.value === 'new', name: 'check' }
      ]);
      const result = builder
        .withContext({ value: 'old' })
        .resetContext()
        .withContext({ value: 'new' })
        .evaluate();
      expect(result).toEqual([[true, 'check']]);
    });
  });

  describe('Context priority', () => {
    test('should prioritize runtime context over accumulated context', () => {
      const builder = createEnvironmentNameBuilder([
        { check: (ctx) => ctx.tier === 'basic', name: 'basic' }
      ]);
      builder.withContext({ tier: 'premium' });
      expect(builder.evaluate({ tier: 'basic' })).toEqual([[true, 'basic']]);
    });

    test('should prioritize accumulated context over process.env', () => {
      process.env.TEST_PRIORITY = 'env-value';
      const builder = createEnvironmentNameBuilder([
        { check: (ctx) => ctx.env.TEST_PRIORITY === 'context-value', name: 'check' }
      ]);
      builder.withContext({ env: { TEST_PRIORITY: 'context-value' } });
      expect(builder.evaluate()).toEqual([[true, 'check']]);
      delete process.env.TEST_PRIORITY;
    });

    test('should use process.env when not overridden', () => {
      process.env.TEST_ENV = 'from-env';
      const builder = createEnvironmentNameBuilder([
        { check: (ctx) => ctx.env.TEST_ENV === 'from-env', name: 'env-match' }
      ]);
      expect(builder.evaluate()).toEqual([[true, 'env-match']]);
      delete process.env.TEST_ENV;
    });

    test('should layer all context sources correctly', () => {
      process.env.LAYER_TEST = 'env';
      const builder = createEnvironmentNameBuilder([
        { check: (ctx) => ctx.env.LAYER_TEST === 'runtime', name: 'runtime-wins' },
        { check: (ctx) => ctx.accumulated === 'yes', name: 'accumulated' }
      ]);
      builder.withContext({ accumulated: 'yes' });
      const result = builder.evaluate({ env: { LAYER_TEST: 'runtime' } });
      expect(result).toEqual([
        [true, 'runtime-wins'],
        [true, 'accumulated']
      ]);
      delete process.env.LAYER_TEST;
    });
  });

  describe('resetContext() method', () => {
    test('should clear accumulated context', () => {
      const builder = createEnvironmentNameBuilder([
        { check: (ctx) => ctx.cleared !== true, name: 'not-cleared' }
      ]);
      builder.withContext({ cleared: true });
      builder.resetContext();
      expect(builder.evaluate()).toEqual([[true, 'not-cleared']]);
    });

    test('should return this for chaining', () => {
      const builder = createEnvironmentNameBuilder([]);
      const result = builder.resetContext();
      expect(result).toBe(builder);
    });

    test('should allow setting new context after reset', () => {
      const builder = createEnvironmentNameBuilder([
        { check: (ctx) => ctx.value === 'new', name: 'new-value' }
      ]);
      builder.withContext({ value: 'old' });
      builder.resetContext();
      builder.withContext({ value: 'new' });
      expect(builder.evaluate()).toEqual([[true, 'new-value']]);
    });
  });

  describe('getContext() method', () => {
    test('should return empty object initially', () => {
      const builder = createEnvironmentNameBuilder([]);
      expect(builder.getContext()).toEqual({});
    });

    test('should return accumulated context', () => {
      const builder = createEnvironmentNameBuilder([]);
      builder.withContext({ tier: 'premium', region: 'us' });
      expect(builder.getContext()).toEqual({ tier: 'premium', region: 'us' });
    });

    test('should return a copy not a reference', () => {
      const builder = createEnvironmentNameBuilder([]);
      builder.withContext({ value: 'original' });
      const ctx = builder.getContext();
      ctx.value = 'modified';
      expect(builder.getContext()).toEqual({ value: 'original' });
    });
  });

  describe('Default value', () => {
    test('should return default value when no conditions match', () => {
      const defaultVal = [['default-env']];
      const builder = createEnvironmentNameBuilder(
        [{ check: false, name: 'never' }],
        defaultVal
      );
      expect(builder.evaluate()).toEqual(defaultVal);
    });

    test('should return empty array by default', () => {
      const builder = createEnvironmentNameBuilder([
        { check: false, name: 'never' }
      ]);
      expect(builder.evaluate()).toEqual([]);
    });

    test('should not return default when at least one condition matches', () => {
      const builder = createEnvironmentNameBuilder(
        [
          { check: false, name: 'no' },
          { check: true, name: 'yes' }
        ],
        [['default']]
      );
      expect(builder.evaluate()).toEqual([[true, 'yes']]);
    });

    test('should support various default value types', () => {
      const builder1 = createEnvironmentNameBuilder([], null);
      expect(builder1.evaluate()).toBe(null);

      const builder2 = createEnvironmentNameBuilder([], 'fallback');
      expect(builder2.evaluate()).toBe('fallback');

      const builder3 = createEnvironmentNameBuilder([], { default: true });
      expect(builder3.evaluate()).toEqual({ default: true });
    });
  });

  describe('Mixed conditions', () => {
    test('should handle mix of static and function conditions', () => {
      const builder = createEnvironmentNameBuilder([
        { check: true, name: 'static-true' },
        { check: () => true, name: 'func-true' },
        { check: false, name: 'static-false' },
        { check: () => false, name: 'func-false' }
      ]);
      expect(builder.evaluate()).toEqual([
        [true, 'static-true'],
        [true, 'func-true']
      ]);
    });

    test('should handle complex real-world scenario', () => {
      process.env.NODE_ENV = 'production';
      process.env.DEBUG = 'true';

      const builder = createEnvironmentNameBuilder([
        { check: (ctx) => ctx.env.NODE_ENV === 'production', name: 'prod' },
        { check: (ctx) => ctx.env.DEBUG === 'true', name: 'debug' },
        { check: (ctx) => ctx.tier === 'premium', name: 'premium' },
        { check: (ctx) => ctx.region === 'us-east-1', name: 'us-east' },
        { check: false, name: 'never' }
      ]);

      const result = builder
        .withContext({ tier: 'premium' })
        .evaluate({ region: 'us-east-1' });

      expect(result).toEqual([
        [true, 'prod'],
        [true, 'debug'],
        [true, 'premium'],
        [true, 'us-east']
      ]);

      delete process.env.NODE_ENV;
      delete process.env.DEBUG;
    });
  });

  describe('Builder instance isolation', () => {
    test('should maintain independent context between instances', () => {
      const builder1 = createEnvironmentNameBuilder([
        { check: (ctx) => ctx.id === 1, name: 'one' }
      ]);
      const builder2 = createEnvironmentNameBuilder([
        { check: (ctx) => ctx.id === 2, name: 'two' }
      ]);

      builder1.withContext({ id: 1 });
      builder2.withContext({ id: 2 });

      expect(builder1.evaluate()).toEqual([[true, 'one']]);
      expect(builder2.evaluate()).toEqual([[true, 'two']]);
    });

    test('should not share accumulated context', () => {
      const conditions = [{ check: (ctx) => ctx.shared === true, name: 'test' }];
      const builder1 = createEnvironmentNameBuilder(conditions);
      const builder2 = createEnvironmentNameBuilder(conditions);

      builder1.withContext({ shared: true });

      expect(builder1.evaluate()).toEqual([[true, 'test']]);
      expect(builder2.evaluate()).toEqual([]);
    });
  });

  describe('Edge cases', () => {
    test('should handle empty conditions array', () => {
      const builder = createEnvironmentNameBuilder([]);
      expect(builder.evaluate()).toEqual([]);
    });

    test('should handle large number of conditions', () => {
      const conditions = Array.from({ length: 100 }, (_, i) => ({
        check: i % 2 === 0,
        name: `condition-${i}`
      }));
      const builder = createEnvironmentNameBuilder(conditions);
      const result = builder.evaluate();
      expect(result.length).toBe(50); // Half should match
    });

    test('should handle conditions with same names', () => {
      const builder = createEnvironmentNameBuilder([
        { check: true, name: 'duplicate' },
        { check: true, name: 'duplicate' }
      ]);
      expect(builder.evaluate()).toEqual([
        [true, 'duplicate'],
        [true, 'duplicate']
      ]);
    });

    test('should handle special characters in names', () => {
      const builder = createEnvironmentNameBuilder([
        { check: true, name: 'name-with-dash' },
        { check: true, name: 'name_with_underscore' },
        { check: true, name: 'name.with.dot' },
        { check: true, name: 'name with spaces' }
      ]);
      expect(builder.evaluate().length).toBe(4);
    });

    test('should handle undefined runtime context', () => {
      const builder = createEnvironmentNameBuilder([
        { check: true, name: 'test' }
      ]);
      expect(builder.evaluate(undefined)).toEqual([[true, 'test']]);
    });

    test('should handle null runtime context', () => {
      const builder = createEnvironmentNameBuilder([
        { check: true, name: 'test' }
      ]);
      expect(builder.evaluate(null)).toEqual([[true, 'test']]);
    });
  });
});
