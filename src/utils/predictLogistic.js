export function predictLogistic(model, features) {
    const { coefficients, intercept, classes } = model;
    const dotProduct = features.reduce((sum, val, i) => sum + val * coefficients[i], 0);
    const z = dotProduct + intercept;
    const prob = 1 / (1 + Math.exp(-z));
    return {
      class: prob >= 0.5 ? classes[1] : classes[0],
      probability: prob,
    };
  }