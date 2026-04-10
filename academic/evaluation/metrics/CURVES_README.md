# ROC and PR Curve Generation

This module provides functionality for generating ROC (Receiver Operating Characteristic) curves and Precision-Recall curves for binary classification evaluation.

## Features

- **ROC Curve Generation**: Generate ROC curves by sweeping through classification thresholds
- **AUC Calculation**: Calculate Area Under Curve using the trapezoidal rule
- **PR Curve Generation**: Generate Precision-Recall curves for classifier evaluation
- **Average Precision**: Calculate Average Precision score (area under PR curve)

## Usage

```javascript
const CurveMetrics = require('./curves');

const curves = new CurveMetrics();

// Your classification results with scores
const results = [
  { score: 0.95, actual: 'bot' },
  { score: 0.88, actual: 'bot' },
  { score: 0.45, actual: 'human' },
  { score: 0.22, actual: 'human' }
];

// Generate ROC curve
const roc = curves.generateROC(results);
console.log(`ROC AUC: ${roc.auc}`);
console.log(`ROC points: ${roc.points.length}`);

// Generate PR curve
const pr = curves.generatePRCurve(results);
console.log(`Average Precision: ${pr.averagePrecision}`);
console.log(`PR points: ${pr.points.length}`);
```

## API Reference

### `generateROC(results)`

Generates ROC curve data by sweeping through thresholds from 0 to 1.

**Parameters:**
- `results` (Array): Array of objects with `score` (number) and `actual` (string: 'bot' or 'human')

**Returns:**
- Object with:
  - `points` (Array): Array of {threshold, tpr, fpr} objects (101 points)
  - `auc` (number): Area Under Curve value [0, 1]

### `calculateAUC(points)`

Calculates Area Under Curve using the trapezoidal rule.

**Parameters:**
- `points` (Array): Array of objects with `fpr` and `tpr` properties

**Returns:**
- `number`: AUC value in range [0, 1]

### `generatePRCurve(results)`

Generates Precision-Recall curve data.

**Parameters:**
- `results` (Array): Array of objects with `score` (number) and `actual` (string: 'bot' or 'human')

**Returns:**
- Object with:
  - `points` (Array): Array of {threshold, precision, recall} objects (101 points)
  - `averagePrecision` (number): Average Precision score [0, 1]

### `calculateAveragePrecision(points)`

Calculates Average Precision (area under PR curve).

**Parameters:**
- `points` (Array): Array of objects with `recall` and `precision` properties

**Returns:**
- `number`: Average Precision in range [0, 1]

## Examples

See the following files for detailed examples:
- `curves-example.js` - Comprehensive usage examples
- `integration-example.js` - Integration with classification metrics

## Testing

Run the test suite:
```bash
npm test -- tests/curves.test.js
```

## Implementation Details

- **Threshold Sweep**: Generates 101 evenly-spaced thresholds from 0.00 to 1.00
- **Trapezoidal Rule**: Uses trapezoidal integration for accurate AUC calculation
- **Edge Cases**: Handles empty results, all positives, all negatives gracefully
- **Sorting**: Automatically sorts points for correct integration

## Performance Considerations

- Time Complexity: O(n * m) where n is number of results and m is number of thresholds (101)
- Space Complexity: O(m) for storing curve points
- For large datasets (>10,000 samples), consider sampling or using approximate methods

## Related Modules

- `classification.js` - Basic classification metrics (accuracy, precision, recall, F1)
- `confusion.js` - Confusion matrix visualization (to be implemented)

## Requirements Satisfied

This implementation satisfies the following requirements from the academic-enhancements spec:

- **Requirement 6.1**: Generate ROC curves with Area Under Curve (AUC) scores ✓
- **Requirement 6.2**: Generate precision-recall curves with Average Precision scores ✓
- **Requirement 6.4**: Provide data for publication-quality curve visualization ✓

## References

- Fawcett, T. (2006). "An introduction to ROC analysis". Pattern Recognition Letters.
- Davis, J., & Goadrich, M. (2006). "The relationship between Precision-Recall and ROC curves". ICML.
