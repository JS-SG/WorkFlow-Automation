function evaluateRule(condition, data = {}) {
  if (!condition || condition.trim() === "") return false;

  try {
    // Create variables from data keys
    const keys = Object.keys(data);
    const values = Object.values(data);

    // Build function dynamically
    const fn = new Function(...keys, `return (${condition});`);

    return fn(...values);
  } catch (error) {
    console.error("Rule evaluation error:", error.message);
    return false;
  }
}

module.exports = evaluateRule;
