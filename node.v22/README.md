# Environment Name Builder

A lightweight utility for generating environment names based on conditional logic. Perfect for runtime environment detection, feature flags, and configuration management.

## Features

- 🎯 **Conditional Logic**: Support for both static boolean values and dynamic functions
- 🔗 **Builder Pattern**: Chainable API with `.withContext()` for clean, readable code
- 🌍 **Process Environment**: Automatic access to `process.env` in all condition functions
- 📊 **Multiple Matches**: Returns all matching conditions, not just the first
- 🎨 **Flexible Context**: Accumulate context at build time, override at runtime
- ✅ **Type Safe**: Boolean coercion ensures consistent logic evaluation
- 🧪 **Well Tested**: Comprehensive test coverage with 90+ test cases

## Installation

```bash
npm install @thinkeloquent/integration-endpoint-runtime-env-name
```

## Quick Start

```javascript
import createEnvironmentNameBuilder from '@thinkeloquent/integration-endpoint-runtime-env-name';

// Create builder with conditions
const builder = createEnvironmentNameBuilder([
  { check: (ctx) => ctx.env.NODE_ENV === 'production', name: 'prod' },
  { check: (ctx) => ctx.env.DEBUG === 'true', name: 'debug' },
  { check: (ctx) => ctx.tier === 'premium', name: 'premium' }
]);

// Evaluate with runtime context
const matches = builder
  .withContext({ tier: 'premium' })
  .evaluate();

console.log(matches);
// Output: [[true, 'prod'], [true, 'debug'], [true, 'premium']]
// (assuming NODE_ENV=production and DEBUG=true)
```

## API Reference

### `createEnvironmentNameBuilder(conditions, defaultValue)`

Creates a new environment name builder instance.

**Parameters:**
- `conditions` (Array): Array of condition objects with `{ check, name }` structure
  - `check`: Boolean value OR function(ctx) returning boolean
  - `name`: String identifier for the condition
- `defaultValue` (any, optional): Value to return when no conditions match (default: `[]`)

**Returns:** Builder instance with chainable methods

**Example:**
```javascript
const builder = createEnvironmentNameBuilder([
  { check: true, name: 'always-on' },
  { check: (ctx) => ctx.isEnabled, name: 'conditional' }
], [['fallback-env']]);
```

### `.withContext(ctx)`

Adds or merges context that will be available to condition functions.

**Parameters:**
- `ctx` (Object): Context object to merge with accumulated context

**Returns:** Builder instance (for chaining)

**Example:**
```javascript
builder
  .withContext({ tier: 'premium' })
  .withContext({ region: 'us-east-1' })
  .evaluate();
```

### `.evaluate(runtimeContext)`

Evaluates all conditions and returns matches as `[true, name]` tuples.

**Parameters:**
- `runtimeContext` (Object, optional): Runtime context to merge (overrides accumulated context)

**Returns:** Array of `[true, name]` for all matching conditions, or `defaultValue` if no matches

**Example:**
```javascript
const matches = builder.evaluate({ requestId: 'abc-123' });
// Returns: [[true, 'prod'], [true, 'debug']]
```

### `.resetContext()`

Clears all accumulated context from previous `.withContext()` calls.

**Returns:** Builder instance (for chaining)

**Example:**
```javascript
builder
  .withContext({ tier: 'premium' })
  .resetContext()
  .withContext({ tier: 'basic' })
  .evaluate();
```

### `.getContext()`

Gets a copy of the current accumulated context (useful for debugging).

**Returns:** Object with accumulated context

**Example:**
```javascript
builder.withContext({ tier: 'premium', region: 'us' });
console.log(builder.getContext());
// Output: { tier: 'premium', region: 'us' }
```

## Context Priority

Context is merged with the following priority (highest to lowest):

1. **Runtime context** (passed to `.evaluate()`)
2. **Accumulated context** (from `.withContext()` calls)
3. **Process environment** (automatically injected as `ctx.env`)

```javascript
process.env.TIER = 'env-tier';

const builder = createEnvironmentNameBuilder([
  { check: (ctx) => ctx.tier === 'runtime-tier', name: 'match' }
]);

builder.withContext({ tier: 'accumulated-tier' });
builder.evaluate({ tier: 'runtime-tier' });
// ✓ Matches! Runtime context overrides accumulated context
```

## Usage Examples

### Static Boolean Conditions

```javascript
const builder = createEnvironmentNameBuilder([
  { check: true, name: 'always-enabled' },
  { check: false, name: 'never-enabled' }
]);

builder.evaluate();
// Returns: [[true, 'always-enabled']]
```

### Function-Based Conditions

```javascript
const builder = createEnvironmentNameBuilder([
  { check: (ctx) => ctx.env.NODE_ENV === 'production', name: 'prod' },
  { check: (ctx) => ctx.env.NODE_ENV === 'development', name: 'dev' }
]);

builder.evaluate();
// Returns: [[true, 'prod']] or [[true, 'dev']] based on NODE_ENV
```

### Closure-Based Conditions

```javascript
const FEATURE_FLAGS = {
  newUI: true,
  betaFeatures: false
};

const builder = createEnvironmentNameBuilder([
  { check: () => FEATURE_FLAGS.newUI, name: 'new-ui' },
  { check: () => FEATURE_FLAGS.betaFeatures, name: 'beta' }
]);

builder.evaluate();
// Returns: [[true, 'new-ui']]
```

### Accumulated Context

```javascript
const builder = createEnvironmentNameBuilder([
  { check: (ctx) => ctx.tier === 'premium' && ctx.region === 'us', name: 'premium-us' }
]);

builder
  .withContext({ tier: 'premium' })
  .withContext({ region: 'us' });

builder.evaluate();
// Returns: [[true, 'premium-us']]
```

### Runtime Context Override

```javascript
const builder = createEnvironmentNameBuilder([
  { check: (ctx) => ctx.mode === 'test', name: 'test-mode' }
]);

builder.withContext({ mode: 'production' });
builder.evaluate({ mode: 'test' });
// Returns: [[true, 'test-mode']]
// Runtime context overrides accumulated context
```

### Default Fallback Value

```javascript
const builder = createEnvironmentNameBuilder(
  [
    { check: false, name: 'never-matches' }
  ],
  [['fallback', 'default-env']]
);

builder.evaluate();
// Returns: [['fallback', 'default-env']]
```

### Complex Multi-Tier Conditions

```javascript
const builder = createEnvironmentNameBuilder([
  // Environment
  { check: (ctx) => ctx.env.NODE_ENV === 'production', name: 'prod' },
  { check: (ctx) => ctx.env.NODE_ENV === 'development', name: 'dev' },

  // Features
  { check: (ctx) => ctx.env.DEBUG === 'true', name: 'debug' },
  { check: (ctx) => ctx.features?.analytics, name: 'analytics' },

  // Customer tier
  { check: (ctx) => ctx.tier === 'enterprise', name: 'enterprise' },
  { check: (ctx) => ctx.tier === 'premium', name: 'premium' },

  // Region
  { check: (ctx) => ctx.region === 'us-east-1', name: 'us-east' },
  { check: (ctx) => ctx.region === 'eu-west-1', name: 'eu-west' }
]);

const matches = builder
  .withContext({
    tier: 'premium',
    features: { analytics: true }
  })
  .evaluate({ region: 'us-east-1' });

console.log(matches);
// Returns: [[true, 'prod'], [true, 'analytics'], [true, 'premium'], [true, 'us-east-1']]
```

## Integration with URL Builder

Use with `@thinkeloquent/simple-endpoint-url-builder` to dynamically select environment endpoints:

```javascript
import createEnvironmentNameBuilder from '@thinkeloquent/integration-endpoint-runtime-env-name';
import createUrlBuilder from '@thinkeloquent/simple-endpoint-url-builder';

// Setup URL builder with environment mappings
const urlBuilder = createUrlBuilder({
  'prod': 'https://api.production.com',
  'staging': 'https://api.staging.com',
  'dev': 'https://api.dev.com',
  'debug': ['https://api.debug.com', '/v1/debug']
}, '/api/v1');

// Setup environment name builder
const envBuilder = createEnvironmentNameBuilder([
  { check: (ctx) => ctx.env.NODE_ENV === 'production', name: 'prod' },
  { check: (ctx) => ctx.env.NODE_ENV === 'development', name: 'dev' },
  { check: (ctx) => ctx.env.DEBUG === 'true', name: 'debug' },
  { check: (ctx) => ctx.isStaging, name: 'staging' }
]);

// Get matching environments
const matches = envBuilder.evaluate({ isStaging: false });
console.log(matches);
// Returns: [[true, 'prod']] (if NODE_ENV=production)

// Build URLs for matched environments
const envNames = matches.map(([_, name]) => name);
const urls = envNames.map(name => urlBuilder.build(name));
console.log(urls);
// Returns: ['https://api.production.com/api/v1']

// Or use first match
const primaryEnv = matches[0]?.[1];
if (primaryEnv) {
  const url = urlBuilder.build(primaryEnv);
  console.log(url);
  // Returns: 'https://api.production.com/api/v1'
}
```

## Time-Based Conditions Example

```javascript
const builder = createEnvironmentNameBuilder([
  {
    check: (ctx) => {
      const hour = new Date().getHours();
      return hour >= 9 && hour < 17; // Business hours
    },
    name: 'business-hours'
  },
  {
    check: (ctx) => {
      const day = new Date().getDay();
      return day === 0 || day === 6; // Weekend
    },
    name: 'weekend'
  }
]);

const matches = builder.evaluate();
// Returns environment names based on current time
```

## Error Handling

The builder validates conditions at construction time and provides clear error messages:

```javascript
// Missing 'check' property
createEnvironmentNameBuilder([{ name: 'test' }]);
// Error: Condition at index 0 missing required property 'check'

// Missing 'name' property
createEnvironmentNameBuilder([{ check: true }]);
// Error: Condition at index 0 missing required property 'name'

// Invalid check type
createEnvironmentNameBuilder([{ check: 'invalid', name: 'test' }]);
// Error: Condition at index 0 'check' must be a boolean or function

// Function throws error during evaluation
createEnvironmentNameBuilder([
  { check: () => { throw new Error('Oops'); }, name: 'test' }
]).evaluate();
// Error: Error evaluating condition 'test': Oops
```

## Testing

Run the comprehensive test suite:

```bash
npm test
```

The package includes 90+ test cases covering:
- Constructor validation
- Static and function-based conditions
- Context accumulation and priority
- Method chaining
- Default values
- Error handling
- Edge cases

## License

ISC

## Related Packages

- [@thinkeloquent/simple-endpoint-url-builder](https://github.com/thinkeloquent/simple-endpoint-url-builder) - URL builder for integration endpoints
- [@thinkeloquent/conditional-logic-analyzer](https://github.com/thinkeloquent/conditional-logic-analyzer) - Analyze conditional logic in codebases
