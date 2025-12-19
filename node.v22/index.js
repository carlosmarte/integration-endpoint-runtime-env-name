/**
 * Environment Name Builder
 * Utility for generating environment names based on conditional logic
 */

/**
 * Creates an environment name builder instance
 * @param {Array} conditions - Array of condition objects with { check, name } structure
 *   - check: boolean value OR function(ctx) returning boolean
 *   - name: string identifier for this condition
 * @param {*} defaultValue - Default value when no conditions match (default: [])
 * @returns {Object} Environment name builder instance with chainable methods
 */
export default function createEnvironmentNameBuilder(conditions = [], defaultValue = []) {
  // Validate conditions array
  if (!Array.isArray(conditions)) {
    throw new Error('Conditions must be an array');
  }

  // Validate each condition has required properties
  for (let i = 0; i < conditions.length; i++) {
    const condition = conditions[i];
    if (!condition || typeof condition !== 'object') {
      throw new Error(`Condition at index ${i} must be an object`);
    }
    if (!('check' in condition)) {
      throw new Error(`Condition at index ${i} missing required property 'check'`);
    }
    if (!('name' in condition)) {
      throw new Error(`Condition at index ${i} missing required property 'name'`);
    }
    // Note: We allow any value for 'check' - it will be coerced to boolean during evaluation
  }

  return {
    conditions,
    defaultValue,
    _context: {}, // Internal accumulated context storage

    /**
     * Adds or merges context that will be available to condition functions
     * @param {Object} ctx - Context object to merge with accumulated context
     * @returns {Object} Builder instance for method chaining
     */
    withContext(ctx = {}) {
      if (ctx && typeof ctx === 'object' && !Array.isArray(ctx)) {
        this._context = { ...this._context, ...ctx };
      }
      return this;
    },

    /**
     * Clears all accumulated context
     * @returns {Object} Builder instance for method chaining
     */
    resetContext() {
      this._context = {};
      return this;
    },

    /**
     * Evaluates all conditions and returns matches as [boolean, name] tuples
     * @param {Object} runtimeContext - Optional runtime context to merge (overrides accumulated context)
     * @returns {Array} Array of [true, name] for all matching conditions, or defaultValue if no matches
     */
    evaluate(runtimeContext = {}) {
      // Build final context with priority: runtime > accumulated > process.env
      const ctx = {
        env: process.env,
        ...this._context,
        ...runtimeContext
      };

      // Evaluate all conditions
      const matches = [];

      for (const condition of this.conditions) {
        let result;

        if (typeof condition.check === 'function') {
          // Execute function with context and coerce to boolean
          try {
            result = !!condition.check(ctx);
          } catch (error) {
            throw new Error(
              `Error evaluating condition '${condition.name}': ${error.message}`
            );
          }
        } else {
          // Coerce static value to boolean
          result = !!condition.check;
        }

        if (result) {
          matches.push([true, condition.name]);
        }
      }

      return matches.length > 0 ? matches : this.defaultValue;
    },

    /**
     * Gets the current accumulated context (for debugging/inspection)
     * @returns {Object} Copy of accumulated context
     */
    getContext() {
      return { ...this._context };
    }
  };
}
