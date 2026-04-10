# Design Document: Academic Enhancements

## Overview

This design document specifies the implementation approach for transforming SENTINEL into a Harvard-level academic project. The system will add comprehensive research documentation, rigorous evaluation methodologies, formal mathematical analysis, professional documentation generation, academic presentation materials, reproducibility infrastructure, and ethical considerations.

The implementation follows a modular architecture where each major capability (LaTeX generation, evaluation framework, documentation, presentation, reproducibility) is implemented as an independent module with clear interfaces. This design ensures maintainability, testability, and extensibility.

### Design Goals

1. **Academic Rigor**: Produce publication-quality research artifacts suitable for top-tier security conferences
2. **Reproducibility**: Enable exact replication of all experiments and results
3. **Automation**: Minimize manual effort in generating academic materials
4. **Modularity**: Independent components that can be used separately or together
5. **Professional Quality**: Match or exceed standards of leading academic institutions

### Key Principles

- **Separation of Concerns**: Data collection, analysis, and presentation are distinct layers
- **Configuration-Driven**: All parameters, thresholds, and settings are externalized
- **Extensibility**: Easy to add new datasets, baselines, or evaluation metrics
- **Documentation-First**: Every component includes comprehensive inline documentation
- **Test Coverage**: All statistical and mathematical operations have unit tests

## Architecture

### High-Level System Architecture


```
┌─────────────────────────────────────────────────────────────────┐
│                    Academic Enhancement System                   │
└─────────────────────────────────────────────────────────────────┘
                              │
        ┌─────────────────────┼─────────────────────┐
        │                     │                     │
        ▼                     ▼                     ▼
┌───────────────┐    ┌────────────────┐    ┌──────────────┐
│   Research    │    │   Evaluation   │    │Documentation │
│   Paper       │    │   Framework    │    │  Generator   │
│   Generator   │    │                │    │              │
└───────────────┘    └────────────────┘    └──────────────┘
        │                     │                     │
        │            ┌────────┴────────┐           │
        │            │                 │           │
        ▼            ▼                 ▼           ▼
┌───────────┐  ┌──────────┐    ┌──────────┐  ┌─────────┐
│  LaTeX    │  │ Dataset  │    │Benchmark │  │   API   │
│ Templates │  │Processor │    │  Suite   │  │  Docs   │
└───────────┘  └──────────┘    └──────────┘  └─────────┘
        │            │                 │           │
        │            ▼                 │           │
        │      ┌──────────┐           │           │
        │      │Statistical│           │           │
        │      │  Tests   │           │           │
        │      └──────────┘           │           │
        │            │                 │           │
        └────────────┴─────────────────┴───────────┘
                     │
                     ▼
        ┌────────────────────────┐
        │  Presentation Builder  │
        │  - Slides              │
        │  - Poster              │
        │  - Interactive Viz     │
        └────────────────────────┘
                     │
                     ▼
        ┌────────────────────────┐
        │ Reproducibility Layer  │
        │  - Docker Container    │
        │  - Experiment Scripts  │
        │  - Seed Management     │
        └────────────────────────┘
```

### Component Interaction Flow

1. **Data Collection**: Dataset processors load and normalize multiple DDoS datasets
2. **Evaluation**: Framework runs experiments, computes metrics, performs statistical tests
3. **Analysis**: Results are analyzed for significance, ablation studies, baseline comparisons
4. **Generation**: LaTeX generator produces paper, documentation generator creates API docs
5. **Presentation**: Slides, posters, and interactive visualizations are generated
6. **Packaging**: Docker containers and scripts bundle everything for reproducibility

### Directory Structure


```
academic/
├── datasets/                    # Dataset processing and storage
│   ├── loaders/
│   │   ├── cicddos2019.js      # CIC-DDoS2019 loader
│   │   ├── caida.js            # CAIDA DDoS dataset loader
│   │   └── unsw.js             # UNSW-NB15 loader
│   ├── processors/
│   │   ├── featureExtractor.js # Extract behavioral features
│   │   └── normalizer.js       # Normalize across datasets
│   └── cache/                  # Processed dataset cache
│
├── evaluation/                  # Evaluation framework
│   ├── metrics/
│   │   ├── classification.js   # Accuracy, precision, recall, F1
│   │   ├── curves.js           # ROC, PR curves
│   │   └── confusion.js        # Confusion matrix
│   ├── statistical/
│   │   ├── ttest.js            # Paired t-tests
│   │   ├── confidence.js       # Confidence intervals
│   │   └── corrections.js      # Multiple comparison corrections
│   ├── ablation/
│   │   └── componentToggle.js  # Enable/disable components
│   ├── baselines/
│   │   ├── simpleRateLimit.js  # Simple rate limiter
│   │   ├── staticBlocklist.js  # Static IP blocklist
│   │   └── thresholdBased.js   # Frequency threshold
│   └── runner.js               # Experiment orchestration
│
├── analysis/                    # Mathematical and complexity analysis
│   ├── complexity/
│   │   ├── timeComplexity.js   # Big O time analysis
│   │   └── spaceComplexity.js  # Big O space analysis
│   ├── formulation/
│   │   └── problemDef.js       # Mathematical problem definition
│   └── limitations/
│       └── theoreticalLimits.js # Limitation analysis
│
├── paper/                       # Research paper generation
│   ├── templates/
│   │   ├── acm.tex             # ACM conference template
│   │   └── ieee.tex            # IEEE conference template
│   ├── sections/
│   │   ├── abstract.js         # Abstract generator
│   │   ├── introduction.js     # Introduction generator
│   │   ├── relatedWork.js      # Related work generator
│   │   ├── methodology.js      # Methodology generator
│   │   ├── results.js          # Results generator
│   │   └── conclusion.js       # Conclusion generator
│   ├── bibliography/
│   │   └── references.bib      # BibTeX references
│   ├── figures/                # Generated figures
│   └── generator.js            # Main paper generator
│
├── documentation/               # Documentation generation
│   ├── api/
│   │   ├── jsdocParser.js      # Parse JSDoc comments
│   │   └── htmlGenerator.js    # Generate HTML docs
│   ├── diagrams/
│   │   ├── architecture.js     # System architecture diagrams
│   │   ├── dataflow.js         # Data flow diagrams
│   │   └── deployment.js       # Deployment diagrams
│   ├── guides/
│   │   ├── deployment.js       # Deployment guide generator
│   │   ├── contributing.js     # Contributing guide generator
│   │   └── replication.js      # Replication guide generator
│   └── generator.js            # Main documentation generator
│
├── presentation/                # Presentation materials
│   ├── slides/
│   │   ├── beamer.js           # LaTeX Beamer generator
│   │   └── powerpoint.js       # PowerPoint generator
│   ├── poster/
│   │   └── academicPoster.js   # Conference poster generator
│   ├── video/
│   │   └── scriptGenerator.js  # Video script generator
│   └── interactive/
│       ├── charts.js           # Interactive charts (D3.js)
│       └── githubPages.js      # GitHub Pages site generator
│
├── reproducibility/             # Reproducibility infrastructure
│   ├── docker/
│   │   ├── Dockerfile          # Main container definition
│   │   ├── docker-compose.yml  # Multi-container setup
│   │   └── entrypoint.sh       # Container entry point
│   ├── scripts/
│   │   ├── runAll.js           # Run all experiments
│   │   ├── runMultiDataset.js  # Multi-dataset evaluation
│   │   ├── runAblation.js      # Ablation study
│   │   └── runBaseline.js      # Baseline comparison
│   ├── seeds/
│   │   └── seedManager.js      # Random seed management
│   └── validation/
│       └── resultValidator.js  # Validate reproduced results
│
├── benchmarking/                # Performance benchmarking
│   ├── latency/
│   │   └── latencyTest.js      # Latency measurement
│   ├── throughput/
│   │   └── throughputTest.js   # Throughput measurement
│   ├── scalability/
│   │   └── scaleTest.js        # Scalability testing
│   └── resources/
│       └── resourceMonitor.js  # CPU/memory monitoring
│
├── ethics/                      # Ethical analysis
│   ├── falsePositives/
│   │   └── impactAnalysis.js   # False positive impact
│   ├── privacy/
│   │   └── privacyAnalysis.js  # Privacy considerations
│   └── misuse/
│       └── misuseAnalysis.js   # Potential misuse analysis
│
├── config/
│   ├── datasets.json           # Dataset configurations
│   ├── evaluation.json         # Evaluation parameters
│   ├── paper.json              # Paper generation config
│   └── reproducibility.json    # Reproducibility settings
│
└── cli.js                       # Command-line interface
```

## Components and Interfaces

### 1. Dataset Processing Layer

#### DatasetLoader Interface


All dataset loaders implement a common interface:

```javascript
class DatasetLoader {
  /**
   * Load dataset from file or URL
   * @param {string} source - Path or URL to dataset
   * @returns {Promise<RawDataset>}
   */
  async load(source) {}
  
  /**
   * Parse dataset into standardized format
   * @param {RawDataset} raw - Raw dataset
   * @returns {Promise<ParsedDataset>}
   */
  async parse(raw) {}
  
  /**
   * Get dataset metadata
   * @returns {DatasetMetadata}
   */
  getMetadata() {}
}

// Standardized dataset format
interface ParsedDataset {
  name: string;
  samples: Array<{
    ip: string;
    timestamp: number;
    features: {
      timingCV: number;
      pathDiversity: number;
      requestCount: number;
      headerCount: number;
      hasAcceptLanguage: boolean;
      methodVariety: number;
      uaEntropy: number;
      avgRequestSize: number;
      hasReferer: boolean;
      sessionDuration: number;
      requestRate: number;
      uniquePathRatio: number;
    };
    label: 'bot' | 'human';
  }>;
  metadata: {
    totalSamples: number;
    botSamples: number;
    humanSamples: number;
    features: string[];
    source: string;
  };
}
```

#### Feature Extraction

The feature extractor converts raw network traces into SENTINEL's behavioral features:

```javascript
class FeatureExtractor {
  /**
   * Extract behavioral features from raw network trace
   * @param {NetworkTrace} trace - Raw network data
   * @returns {BehavioralFeatures}
   */
  extract(trace) {
    return {
      timingCV: this._calculateTimingCV(trace.timestamps),
      pathDiversity: this._calculatePathDiversity(trace.paths),
      requestCount: trace.requests.length,
      headerCount: this._averageHeaderCount(trace.requests),
      hasAcceptLanguage: this._hasAcceptLanguage(trace.requests),
      methodVariety: this._countUniqueMethods(trace.requests),
      uaEntropy: this._calculateUAEntropy(trace.userAgents),
      avgRequestSize: this._averageRequestSize(trace.requests),
      hasReferer: this._hasReferer(trace.requests),
      sessionDuration: this._calculateSessionDuration(trace.timestamps),
      requestRate: this._calculateRequestRate(trace.timestamps),
      uniquePathRatio: this._calculateUniquePathRatio(trace.paths)
    };
  }
  
  _calculateTimingCV(timestamps) {
    const gaps = [];
    for (let i = 1; i < timestamps.length; i++) {
      gaps.push(timestamps[i] - timestamps[i-1]);
    }
    const mean = gaps.reduce((a, b) => a + b, 0) / gaps.length;
    const variance = gaps.reduce((sum, gap) => sum + Math.pow(gap - mean, 2), 0) / gaps.length;
    const stddev = Math.sqrt(variance);
    return stddev / mean;
  }
  
  _calculateUAEntropy(userAgents) {
    const ua = userAgents[0] || '';
    const freq = {};
    for (const char of ua) {
      freq[char] = (freq[char] || 0) + 1;
    }
    let entropy = 0;
    for (const count of Object.values(freq)) {
      const p = count / ua.length;
      entropy -= p * Math.log2(p);
    }
    return entropy;
  }
  
  // Additional feature calculation methods...
}
```

#### Dataset Normalization

Ensures features are comparable across different datasets:

```javascript
class DatasetNormalizer {
  /**
   * Normalize features to [0, 1] range
   * @param {ParsedDataset} dataset
   * @returns {NormalizedDataset}
   */
  normalize(dataset) {
    const stats = this._calculateStats(dataset);
    
    return {
      ...dataset,
      samples: dataset.samples.map(sample => ({
        ...sample,
        features: this._normalizeFeatures(sample.features, stats)
      })),
      normalizationStats: stats
    };
  }
  
  _calculateStats(dataset) {
    const features = dataset.samples.map(s => s.features);
    const stats = {};
    
    for (const key of Object.keys(features[0])) {
      if (typeof features[0][key] === 'number') {
        const values = features.map(f => f[key]);
        stats[key] = {
          min: Math.min(...values),
          max: Math.max(...values),
          mean: values.reduce((a, b) => a + b, 0) / values.length,
          stddev: Math.sqrt(
            values.reduce((sum, v) => sum + Math.pow(v - stats[key].mean, 2), 0) / values.length
          )
        };
      }
    }
    
    return stats;
  }
  
  _normalizeFeatures(features, stats) {
    const normalized = { ...features };
    
    for (const [key, value] of Object.entries(features)) {
      if (typeof value === 'number' && stats[key]) {
        // Min-max normalization to [0, 1]
        normalized[key] = (value - stats[key].min) / (stats[key].max - stats[key].min);
      }
    }
    
    return normalized;
  }
}
```

### 2. Evaluation Framework

#### Metrics Calculator


```javascript
class ClassificationMetrics {
  /**
   * Calculate all classification metrics
   * @param {Array<{predicted: string, actual: string}>} results
   * @returns {Metrics}
   */
  calculate(results) {
    const cm = this._confusionMatrix(results);
    
    return {
      accuracy: (cm.tp + cm.tn) / (cm.tp + cm.tn + cm.fp + cm.fn),
      precision: cm.tp / (cm.tp + cm.fp),
      recall: cm.tp / (cm.tp + cm.fn),
      f1Score: 2 * (precision * recall) / (precision + recall),
      specificity: cm.tn / (cm.tn + cm.fp),
      confusionMatrix: cm
    };
  }
  
  _confusionMatrix(results) {
    let tp = 0, tn = 0, fp = 0, fn = 0;
    
    for (const result of results) {
      if (result.actual === 'bot' && result.predicted === 'bot') tp++;
      else if (result.actual === 'human' && result.predicted === 'human') tn++;
      else if (result.actual === 'human' && result.predicted === 'bot') fp++;
      else if (result.actual === 'bot' && result.predicted === 'human') fn++;
    }
    
    return { tp, tn, fp, fn };
  }
  
  /**
   * Generate ROC curve data
   * @param {Array<{score: number, actual: string}>} results
   * @returns {ROCCurve}
   */
  generateROC(results) {
    const sorted = results.sort((a, b) => b.score - a.score);
    const points = [];
    
    for (let threshold = 0; threshold <= 1; threshold += 0.01) {
      const predictions = sorted.map(r => ({
        predicted: r.score >= threshold ? 'bot' : 'human',
        actual: r.actual
      }));
      
      const cm = this._confusionMatrix(predictions);
      const tpr = cm.tp / (cm.tp + cm.fn); // True Positive Rate
      const fpr = cm.fp / (cm.fp + cm.tn); // False Positive Rate
      
      points.push({ threshold, tpr, fpr });
    }
    
    const auc = this._calculateAUC(points);
    
    return { points, auc };
  }
  
  _calculateAUC(points) {
    let auc = 0;
    for (let i = 1; i < points.length; i++) {
      const width = points[i].fpr - points[i-1].fpr;
      const height = (points[i].tpr + points[i-1].tpr) / 2;
      auc += width * height;
    }
    return auc;
  }
}
```

#### Statistical Testing

```javascript
class StatisticalTests {
  /**
   * Perform paired t-test
   * @param {number[]} sample1 - First sample
   * @param {number[]} sample2 - Second sample
   * @returns {TTestResult}
   */
  pairedTTest(sample1, sample2) {
    if (sample1.length !== sample2.length) {
      throw new Error('Samples must have equal length for paired t-test');
    }
    
    const differences = sample1.map((v, i) => v - sample2[i]);
    const n = differences.length;
    const mean = differences.reduce((a, b) => a + b, 0) / n;
    const variance = differences.reduce((sum, d) => sum + Math.pow(d - mean, 2), 0) / (n - 1);
    const stdError = Math.sqrt(variance / n);
    const tStatistic = mean / stdError;
    const degreesOfFreedom = n - 1;
    const pValue = this._tDistributionPValue(tStatistic, degreesOfFreedom);
    
    return {
      tStatistic,
      degreesOfFreedom,
      pValue,
      significant: pValue < 0.05,
      meanDifference: mean,
      standardError: stdError
    };
  }
  
  /**
   * Calculate confidence interval
   * @param {number[]} sample
   * @param {number} confidence - Confidence level (e.g., 0.95)
   * @returns {ConfidenceInterval}
   */
  confidenceInterval(sample, confidence = 0.95) {
    const n = sample.length;
    const mean = sample.reduce((a, b) => a + b, 0) / n;
    const variance = sample.reduce((sum, v) => sum + Math.pow(v - mean, 2), 0) / (n - 1);
    const stdError = Math.sqrt(variance / n);
    
    // Critical value from t-distribution
    const alpha = 1 - confidence;
    const df = n - 1;
    const tCritical = this._tCriticalValue(alpha / 2, df);
    
    const marginOfError = tCritical * stdError;
    
    return {
      mean,
      lower: mean - marginOfError,
      upper: mean + marginOfError,
      confidence,
      marginOfError
    };
  }
  
  /**
   * Bonferroni correction for multiple comparisons
   * @param {number[]} pValues
   * @param {number} alpha - Significance level
   * @returns {BonferroniResult}
   */
  bonferroniCorrection(pValues, alpha = 0.05) {
    const correctedAlpha = alpha / pValues.length;
    const significant = pValues.map(p => p < correctedAlpha);
    
    return {
      correctedAlpha,
      significant,
      numSignificant: significant.filter(s => s).length
    };
  }
  
  // Helper methods for t-distribution calculations
  _tDistributionPValue(t, df) {
    // Approximation using normal distribution for large df
    // For production, use a proper statistical library
    if (df > 30) {
      return 2 * (1 - this._normalCDF(Math.abs(t)));
    }
    // For small df, use lookup table or numerical integration
    return this._tDistributionCDFApprox(t, df);
  }
  
  _normalCDF(z) {
    // Standard normal CDF approximation
    return 0.5 * (1 + this._erf(z / Math.sqrt(2)));
  }
  
  _erf(x) {
    // Error function approximation
    const a1 = 0.254829592;
    const a2 = -0.284496736;
    const a3 = 1.421413741;
    const a4 = -1.453152027;
    const a5 = 1.061405429;
    const p = 0.3275911;
    
    const sign = x < 0 ? -1 : 1;
    x = Math.abs(x);
    
    const t = 1.0 / (1.0 + p * x);
    const y = 1.0 - (((((a5 * t + a4) * t) + a3) * t + a2) * t + a1) * t * Math.exp(-x * x);
    
    return sign * y;
  }
}
```

#### Ablation Study Framework


```javascript
class AblationStudy {
  constructor(sentinelInstance) {
    this.sentinel = sentinelInstance;
    this.components = {
      rateLimiter: true,
      fingerprinter: true,
      contagionGraph: true,
      neuralPredictor: true,
      adaptiveThreatIntel: true
    };
  }
  
  /**
   * Run ablation study by disabling each component
   * @param {ParsedDataset} dataset
   * @returns {AblationResults}
   */
  async run(dataset) {
    const results = {};
    
    // Baseline: all components enabled
    results.full = await this._evaluate(dataset, this.components);
    
    // Test with each component disabled
    for (const component of Object.keys(this.components)) {
      const config = { ...this.components, [component]: false };
      results[`without_${component}`] = await this._evaluate(dataset, config);
    }
    
    // Calculate contribution of each component
    const contributions = {};
    for (const component of Object.keys(this.components)) {
      const withComponent = results.full.f1Score;
      const withoutComponent = results[`without_${component}`].f1Score;
      contributions[component] = {
        absoluteDrop: withComponent - withoutComponent,
        relativeDrop: ((withComponent - withoutComponent) / withComponent) * 100
      };
    }
    
    return {
      results,
      contributions,
      componentRanking: this._rankComponents(contributions)
    };
  }
  
  async _evaluate(dataset, componentConfig) {
    // Configure SENTINEL with specified components
    this._configureComponents(componentConfig);
    
    const predictions = [];
    for (const sample of dataset.samples) {
      const result = await this.sentinel.classify(sample);
      predictions.push({
        predicted: result.verdict,
        actual: sample.label,
        score: result.botProbability
      });
    }
    
    const metrics = new ClassificationMetrics();
    return metrics.calculate(predictions);
  }
  
  _configureComponents(config) {
    // Enable/disable components in SENTINEL
    if (!config.rateLimiter) {
      this.sentinel.rateLimiter.disable();
    }
    if (!config.fingerprinter) {
      this.sentinel.fingerprinter.disable();
    }
    // ... configure other components
  }
  
  _rankComponents(contributions) {
    return Object.entries(contributions)
      .sort((a, b) => b[1].absoluteDrop - a[1].absoluteDrop)
      .map(([component, impact]) => ({ component, ...impact }));
  }
}
```

#### Baseline Implementations

```javascript
// Simple rate limiting baseline
class SimpleRateLimitBaseline {
  constructor(threshold = 100, windowMs = 10000) {
    this.threshold = threshold;
    this.windowMs = windowMs;
    this.requests = new Map();
  }
  
  classify(sample) {
    const ip = sample.ip;
    const now = Date.now();
    
    if (!this.requests.has(ip)) {
      this.requests.set(ip, []);
    }
    
    const timestamps = this.requests.get(ip);
    timestamps.push(now);
    
    // Remove old timestamps
    const windowStart = now - this.windowMs;
    const recentRequests = timestamps.filter(t => t > windowStart);
    this.requests.set(ip, recentRequests);
    
    return {
      verdict: recentRequests.length > this.threshold ? 'bot' : 'human',
      botProbability: Math.min(1, recentRequests.length / this.threshold)
    };
  }
}

// Static blocklist baseline
class StaticBlocklistBaseline {
  constructor(blocklist = []) {
    this.blocklist = new Set(blocklist);
  }
  
  classify(sample) {
    const isBlocked = this.blocklist.has(sample.ip);
    return {
      verdict: isBlocked ? 'bot' : 'human',
      botProbability: isBlocked ? 1.0 : 0.0
    };
  }
}

// Threshold-based baseline
class ThresholdBaseline {
  constructor(thresholds = {}) {
    this.thresholds = {
      requestRate: 10,  // requests per second
      timingCV: 0.3,    // coefficient of variation
      pathDiversity: 0.5,
      ...thresholds
    };
  }
  
  classify(sample) {
    let botScore = 0;
    let checks = 0;
    
    if (sample.features.requestRate > this.thresholds.requestRate) {
      botScore++;
    }
    checks++;
    
    if (sample.features.timingCV < this.thresholds.timingCV) {
      botScore++;
    }
    checks++;
    
    if (sample.features.pathDiversity < this.thresholds.pathDiversity) {
      botScore++;
    }
    checks++;
    
    const botProbability = botScore / checks;
    
    return {
      verdict: botProbability > 0.5 ? 'bot' : 'human',
      botProbability
    };
  }
}
```

### 3. LaTeX Paper Generation

#### Paper Generator Architecture


```javascript
class PaperGenerator {
  constructor(config) {
    this.config = config;
    this.template = config.template || 'acm'; // 'acm' or 'ieee'
    this.sections = {
      abstract: new AbstractGenerator(),
      introduction: new IntroductionGenerator(),
      relatedWork: new RelatedWorkGenerator(),
      methodology: new MethodologyGenerator(),
      results: new ResultsGenerator(),
      conclusion: new ConclusionGenerator()
    };
  }
  
  /**
   * Generate complete research paper
   * @param {EvaluationResults} results
   * @returns {Promise<string>} LaTeX source
   */
  async generate(results) {
    const latex = [];
    
    // Document class and packages
    latex.push(this._generatePreamble());
    
    // Title and authors
    latex.push(this._generateTitle());
    
    // Begin document
    latex.push('\\begin{document}');
    latex.push('\\maketitle');
    
    // Abstract
    latex.push('\\begin{abstract}');
    latex.push(await this.sections.abstract.generate(results));
    latex.push('\\end{abstract}');
    
    // Sections
    for (const [name, generator] of Object.entries(this.sections)) {
      if (name === 'abstract') continue;
      latex.push(await generator.generate(results));
    }
    
    // Bibliography
    latex.push('\\bibliographystyle{ACM-Reference-Format}');
    latex.push('\\bibliography{references}');
    
    latex.push('\\end{document}');
    
    return latex.join('\n\n');
  }
  
  _generatePreamble() {
    if (this.template === 'acm') {
      return `\\documentclass[sigconf]{acmart}
\\usepackage{amsmath}
\\usepackage{algorithm}
\\usepackage{algorithmic}
\\usepackage{graphicx}
\\usepackage{booktabs}
\\usepackage{hyperref}`;
    } else {
      return `\\documentclass[conference]{IEEEtran}
\\usepackage{amsmath}
\\usepackage{algorithm}
\\usepackage{algorithmic}
\\usepackage{graphicx}
\\usepackage{cite}`;
    }
  }
  
  _generateTitle() {
    return `\\title{SENTINEL: Behavioral Contagion Graph for Distributed DDoS Detection}

\\author{
  \\IEEEauthorblockN{Author Name}
  \\IEEEauthorblockA{Institution\\\\
  Email: author@institution.edu}
}`;
  }
}
```

#### Section Generators

```javascript
class MethodologyGenerator {
  async generate(results) {
    const sections = [];
    
    sections.push('\\section{Methodology}');
    
    // Problem formulation
    sections.push(this._generateProblemFormulation());
    
    // System architecture
    sections.push(this._generateArchitecture());
    
    // Algorithms
    sections.push(this._generateAlgorithms());
    
    // Complexity analysis
    sections.push(this._generateComplexityAnalysis());
    
    return sections.join('\n\n');
  }
  
  _generateProblemFormulation() {
    return `\\subsection{Problem Formulation}

Let $\\mathcal{X}$ be the space of behavioral feature vectors, where each $\\mathbf{x} \\in \\mathcal{X}$ represents an IP address with features:

\\begin{equation}
\\mathbf{x} = (x_1, x_2, \\ldots, x_d) \\in \\mathbb{R}^d
\\end{equation}

where $d = 12$ features including timing coefficient of variation, path diversity, request rate, etc.

The DDoS detection problem is to learn a classifier $f: \\mathcal{X} \\rightarrow \\{0, 1\\}$ that maps feature vectors to binary labels (0 = human, 1 = bot), minimizing the expected loss:

\\begin{equation}
\\mathcal{L}(f) = \\mathbb{E}_{(\\mathbf{x}, y) \\sim \\mathcal{D}}[\\ell(f(\\mathbf{x}), y)]
\\end{equation}

where $\\mathcal{D}$ is the true distribution of traffic, $y$ is the true label, and $\\ell$ is the classification loss function.`;
  }
  
  _generateArchitecture() {
    return `\\subsection{System Architecture}

SENTINEL employs a multi-layer defense architecture:

\\begin{enumerate}
\\item \\textbf{Rate Limiting Layer}: Sliding window rate limiter with exponential backoff
\\item \\textbf{Behavioral Fingerprinting}: Entropy-based feature extraction
\\item \\textbf{Contagion Graph}: LSH-accelerated similarity clustering
\\item \\textbf{Neural Predictor}: Online learning neural network
\\item \\textbf{Adaptive Threat Intelligence}: Temporal pattern analysis
\\end{enumerate}

\\begin{figure}[t]
\\centering
\\includegraphics[width=\\columnwidth]{figures/architecture.pdf}
\\caption{SENTINEL system architecture showing data flow through protection layers.}
\\label{fig:architecture}
\\end{figure}`;
  }
  
  _generateAlgorithms() {
    return `\\subsection{Core Algorithms}

\\subsubsection{Behavioral Fingerprinting}

For each IP address $i$, we compute a behavioral vector $\\mathbf{v}_i$:

\\begin{equation}
\\mathbf{v}_i = (\\text{CV}_i, \\text{H}_i, \\text{D}_i, \\ldots)
\\end{equation}

where:
\\begin{itemize}
\\item $\\text{CV}_i = \\frac{\\sigma_i}{\\mu_i}$ is the coefficient of variation of inter-request times
\\item $\\text{H}_i = -\\sum_{c} p(c) \\log_2 p(c)$ is the Shannon entropy of the User-Agent string
\\item $\\text{D}_i = \\frac{|\\text{unique paths}|}{|\\text{total requests}|}$ is path diversity
\\end{itemize}

\\subsubsection{Contagion Graph}

We construct a similarity graph $G = (V, E)$ where:
\\begin{itemize}
\\item $V$ is the set of IP addresses
\\item $(i, j) \\in E$ iff $\\text{sim}(\\mathbf{v}_i, \\mathbf{v}_j) > \\theta$
\\end{itemize}

Similarity is computed using cosine similarity:

\\begin{equation}
\\text{sim}(\\mathbf{v}_i, \\mathbf{v}_j) = \\frac{\\mathbf{v}_i \\cdot \\mathbf{v}_j}{\\|\\mathbf{v}_i\\| \\|\\mathbf{v}_j\\|}
\\end{equation}

When an IP $i$ is confirmed as a bot, contagion spreads to neighbors:

\\begin{algorithm}
\\caption{Contagion Spread}
\\begin{algorithmic}
\\REQUIRE Confirmed bot IP $i$, threshold $\\tau$
\\FOR{each neighbor $j$ of $i$}
  \\IF{$\\text{sim}(\\mathbf{v}_i, \\mathbf{v}_j) > \\tau$}
    \\STATE Flag $j$ as suspicious
  \\ENDIF
\\ENDFOR
\\end{algorithmic}
\\end{algorithm}`;
  }
  
  _generateComplexityAnalysis() {
    return `\\subsection{Computational Complexity}

\\begin{table}[t]
\\centering
\\caption{Time complexity of SENTINEL components}
\\label{tab:complexity}
\\begin{tabular}{lcc}
\\toprule
Component & Time Complexity & Space Complexity \\\\
\\midrule
Rate Limiter & $O(n)$ & $O(m \\cdot n)$ \\\\
Fingerprinter & $O(k)$ & $O(m)$ \\\\
Contagion Graph (LSH) & $O(\\log m)$ & $O(m \\cdot d)$ \\\\
Neural Predictor & $O(d \\cdot h)$ & $O(d \\cdot h)$ \\\\
\\bottomrule
\\end{tabular}
\\end{table}

where $n$ is the number of requests in the sliding window, $m$ is the number of active IPs, $k$ is the number of features, $d$ is the feature dimension, and $h$ is the hidden layer size.

The LSH-based contagion graph reduces similarity search from $O(m)$ to $O(\\log m)$, enabling scalability to millions of IPs.`;
  }
}
```

#### Results Generator


```javascript
class ResultsGenerator {
  async generate(results) {
    const sections = [];
    
    sections.push('\\section{Experimental Results}');
    
    // Multi-dataset evaluation
    sections.push(this._generateMultiDatasetResults(results.multiDataset));
    
    // Baseline comparison
    sections.push(this._generateBaselineComparison(results.baseline));
    
    // Ablation study
    sections.push(this._generateAblationStudy(results.ablation));
    
    // Statistical significance
    sections.push(this._generateStatisticalTests(results.statistical));
    
    return sections.join('\n\n');
  }
  
  _generateMultiDatasetResults(results) {
    const rows = results.datasets.map(ds => {
      return `${ds.name} & ${ds.accuracy.toFixed(2)} & ${ds.precision.toFixed(2)} & ${ds.recall.toFixed(2)} & ${ds.f1Score.toFixed(2)} \\\\`;
    }).join('\n');
    
    return `\\subsection{Multi-Dataset Evaluation}

We evaluated SENTINEL on three public DDoS datasets to demonstrate generalization.

\\begin{table}[t]
\\centering
\\caption{Performance across multiple datasets}
\\label{tab:multidataset}
\\begin{tabular}{lcccc}
\\toprule
Dataset & Accuracy & Precision & Recall & F1-Score \\\\
\\midrule
${rows}
\\bottomrule
\\end{tabular}
\\end{table}

SENTINEL achieves consistently high performance across all datasets, with F1-scores above 0.95, demonstrating strong generalization beyond the training distribution.`;
  }
  
  _generateBaselineComparison(results) {
    const rows = results.methods.map(method => {
      const improvement = ((results.sentinel.f1Score - method.f1Score) / method.f1Score * 100).toFixed(1);
      return `${method.name} & ${method.f1Score.toFixed(2)} & ${improvement}\\% \\\\`;
    }).join('\n');
    
    return `\\subsection{Baseline Comparison}

\\begin{table}[t]
\\centering
\\caption{Comparison with baseline methods}
\\label{tab:baseline}
\\begin{tabular}{lcc}
\\toprule
Method & F1-Score & Improvement \\\\
\\midrule
SENTINEL (Ours) & ${results.sentinel.f1Score.toFixed(2)} & -- \\\\
${rows}
\\bottomrule
\\end{tabular}
\\end{table}

SENTINEL significantly outperforms all baseline methods, achieving ${((results.sentinel.f1Score - results.methods[0].f1Score) / results.methods[0].f1Score * 100).toFixed(1)}\\% improvement over the best baseline.`;
  }
  
  _generateAblationStudy(results) {
    const rows = results.components.map(comp => {
      return `${comp.name} & ${comp.f1Score.toFixed(2)} & ${comp.drop.toFixed(2)} & ${comp.relativeDrop.toFixed(1)}\\% \\\\`;
    }).join('\n');
    
    return `\\subsection{Ablation Study}

To understand the contribution of each component, we performed an ablation study by removing components one at a time.

\\begin{table}[t]
\\centering
\\caption{Ablation study results}
\\label{tab:ablation}
\\begin{tabular}{lccc}
\\toprule
Configuration & F1-Score & Absolute Drop & Relative Drop \\\\
\\midrule
Full System & ${results.full.f1Score.toFixed(2)} & -- & -- \\\\
${rows}
\\bottomrule
\\end{tabular}
\\end{table}

The contagion graph contributes the most to performance, with its removal causing a ${results.components[0].relativeDrop.toFixed(1)}\\% drop in F1-score. This validates our hypothesis that distributed botnet detection requires graph-based clustering.`;
  }
  
  _generateStatisticalTests(results) {
    const rows = results.comparisons.map(comp => {
      const sig = comp.pValue < 0.05 ? '$^*$' : '';
      return `${comp.method} & ${comp.tStatistic.toFixed(2)} & ${comp.pValue.toFixed(4)}${sig} \\\\`;
    }).join('\n');
    
    return `\\subsection{Statistical Significance}

We performed paired t-tests to verify that SENTINEL's improvements are statistically significant.

\\begin{table}[t]
\\centering
\\caption{Statistical significance tests ($^*$ indicates $p < 0.05$)}
\\label{tab:statistical}
\\begin{tabular}{lcc}
\\toprule
Comparison & t-statistic & p-value \\\\
\\midrule
${rows}
\\bottomrule
\\end{tabular}
\\end{table}

All comparisons show $p < 0.05$, confirming that SENTINEL's improvements are statistically significant and not due to random chance.`;
  }
}
```

### 4. Documentation Generation

#### API Documentation Generator

```javascript
class APIDocumentationGenerator {
  constructor() {
    this.parser = new JSDocParser();
  }
  
  /**
   * Generate HTML API documentation from source files
   * @param {string[]} sourceFiles - Paths to source files
   * @returns {Promise<string>} HTML documentation
   */
  async generate(sourceFiles) {
    const docs = [];
    
    for (const file of sourceFiles) {
      const parsed = await this.parser.parse(file);
      docs.push(this._generateFileDoc(parsed));
    }
    
    return this._wrapInHTML(docs);
  }
  
  _generateFileDoc(parsed) {
    const sections = [];
    
    sections.push(`<h2>${parsed.filename}</h2>`);
    sections.push(`<p>${parsed.description}</p>`);
    
    // Classes
    for (const cls of parsed.classes) {
      sections.push(this._generateClassDoc(cls));
    }
    
    // Functions
    for (const func of parsed.functions) {
      sections.push(this._generateFunctionDoc(func));
    }
    
    return sections.join('\n');
  }
  
  _generateClassDoc(cls) {
    return `
<div class="class">
  <h3>${cls.name}</h3>
  <p>${cls.description}</p>
  
  <h4>Constructor</h4>
  <pre><code>new ${cls.name}(${cls.constructor.params.map(p => p.name).join(', ')})</code></pre>
  
  <h4>Parameters</h4>
  <ul>
    ${cls.constructor.params.map(p => `
      <li><code>${p.name}</code> (${p.type}) - ${p.description}</li>
    `).join('')}
  </ul>
  
  <h4>Methods</h4>
  ${cls.methods.map(m => this._generateMethodDoc(m)).join('\n')}
</div>`;
  }
  
  _generateMethodDoc(method) {
    return `
<div class="method">
  <h5>${method.name}</h5>
  <p>${method.description}</p>
  <pre><code>${method.signature}</code></pre>
  
  <h6>Parameters</h6>
  <ul>
    ${method.params.map(p => `
      <li><code>${p.name}</code> (${p.type}) - ${p.description}</li>
    `).join('')}
  </ul>
  
  <h6>Returns</h6>
  <p>${method.returns.type} - ${method.returns.description}</p>
  
  ${method.example ? `
    <h6>Example</h6>
    <pre><code>${method.example}</code></pre>
  ` : ''}
</div>`;
  }
  
  _wrapInHTML(docs) {
    return `
<!DOCTYPE html>
<html>
<head>
  <title>SENTINEL API Documentation</title>
  <style>
    body { font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif; max-width: 1200px; margin: 0 auto; padding: 20px; }
    h2 { border-bottom: 2px solid #333; padding-bottom: 10px; }
    h3 { color: #0066cc; }
    .class { margin: 30px 0; padding: 20px; background: #f5f5f5; border-radius: 5px; }
    .method { margin: 15px 0; padding: 15px; background: white; border-left: 3px solid #0066cc; }
    pre { background: #282c34; color: #abb2bf; padding: 15px; border-radius: 5px; overflow-x: auto; }
    code { font-family: 'Monaco', 'Courier New', monospace; }
  </style>
</head>
<body>
  <h1>SENTINEL API Documentation</h1>
  ${docs.join('\n')}
</body>
</html>`;
  }
}
```

#### Diagram Generator


```javascript
class DiagramGenerator {
  /**
   * Generate architecture diagram using Mermaid
   * @returns {string} Mermaid diagram code
   */
  generateArchitecture() {
    return `
graph TB
    A[Incoming Request] --> B[IP Extraction]
    B --> C{Allowlist?}
    C -->|Yes| D[Allow]
    C -->|No| E[Honeypot Check]
    E -->|Trap Hit| F[Block 24h]
    E -->|Pass| G[Rate Limiter]
    G -->|Exceeded| H[Exponential Backoff]
    G -->|Pass| I[Behavioral Fingerprinting]
    I --> J[Contagion Graph]
    J --> K[Neural Predictor]
    K --> L[Adaptive Threat Intel]
    L --> M{Bot Verdict}
    M -->|Bot| N[Challenge/Block]
    M -->|Human| O[Allow]
    N --> P[Learn from Feedback]
    P --> K
`;
  }
  
  /**
   * Generate data flow diagram
   * @returns {string} Mermaid diagram code
   */
  generateDataFlow() {
    return `
sequenceDiagram
    participant Client
    participant SENTINEL
    participant Redis
    participant MathPool
    
    Client->>SENTINEL: HTTP Request
    SENTINEL->>Redis: Load IP Profile
    Redis-->>SENTINEL: Profile Data
    SENTINEL->>SENTINEL: Rate Limit Check
    SENTINEL->>SENTINEL: Fingerprint Behavior
    SENTINEL->>SENTINEL: Contagion Graph Lookup
    SENTINEL->>MathPool: Neural Forward Pass
    MathPool-->>SENTINEL: Bot Probability
    SENTINEL->>Client: Response (Allow/Challenge/Block)
    
    alt Bot Confirmed
        SENTINEL->>MathPool: Neural Backward Pass
        MathPool-->>SENTINEL: Updated Weights
        SENTINEL->>Redis: Update Profile
    end
`;
  }
  
  /**
   * Generate deployment diagram
   * @returns {string} Mermaid diagram code
   */
  generateDeployment() {
    return `
graph LR
    subgraph "Load Balancer"
        LB[Nginx/HAProxy]
    end
    
    subgraph "SENTINEL Cluster"
        S1[SENTINEL Node 1]
        S2[SENTINEL Node 2]
        S3[SENTINEL Node 3]
    end
    
    subgraph "State Layer"
        R1[(Redis Primary)]
        R2[(Redis Replica)]
    end
    
    subgraph "P2P Mesh"
        P1[Gossip Protocol]
    end
    
    LB --> S1
    LB --> S2
    LB --> S3
    
    S1 --> R1
    S2 --> R1
    S3 --> R1
    R1 --> R2
    
    S1 <--> P1
    S2 <--> P1
    S3 <--> P1
`;
  }
  
  /**
   * Export diagram to SVG using Mermaid CLI
   * @param {string} mermaidCode
   * @param {string} outputPath
   */
  async exportToSVG(mermaidCode, outputPath) {
    const { exec } = require('child_process');
    const { promisify } = require('util');
    const execAsync = promisify(exec);
    
    // Write mermaid code to temp file
    const tempFile = '/tmp/diagram.mmd';
    await fs.writeFile(tempFile, mermaidCode);
    
    // Convert to SVG using mermaid-cli
    await execAsync(`mmdc -i ${tempFile} -o ${outputPath}`);
  }
}
```

### 5. Presentation Materials

#### Slide Generator

```javascript
class SlideGenerator {
  /**
   * Generate LaTeX Beamer slides
   * @param {EvaluationResults} results
   * @returns {string} LaTeX Beamer source
   */
  generate(results) {
    const slides = [];
    
    slides.push(this._generatePreamble());
    slides.push('\\begin{document}');
    
    // Title slide
    slides.push(this._generateTitleSlide());
    
    // Content slides
    slides.push(this._generateMotivationSlide());
    slides.push(this._generateApproachSlide());
    slides.push(this._generateArchitectureSlide());
    slides.push(this._generateResultsSlide(results));
    slides.push(this._generateAblationSlide(results));
    slides.push(this._generateConclusionSlide());
    
    slides.push('\\end{document}');
    
    return slides.join('\n\n');
  }
  
  _generatePreamble() {
    return `\\documentclass{beamer}
\\usetheme{Madrid}
\\usecolortheme{default}

\\usepackage{graphicx}
\\usepackage{booktabs}
\\usepackage{amsmath}

\\title{SENTINEL: Behavioral Contagion Graph for Distributed DDoS Detection}
\\author{Author Name}
\\institute{Institution}
\\date{\\today}`;
  }
  
  _generateMotivationSlide() {
    return `\\begin{frame}{Motivation}
\\begin{itemize}
  \\item Traditional DDoS defenses treat each IP independently
  \\item Distributed botnets stay under per-IP rate limits
  \\item Need to detect coordinated attacks across multiple IPs
\\end{itemize}

\\vspace{1em}

\\textbf{Key Insight:} Bots in a botnet share behavioral patterns

\\begin{figure}
\\centering
\\includegraphics[width=0.7\\textwidth]{figures/botnet-coordination.pdf}
\\end{figure}
\\end{frame}`;
  }
  
  _generateApproachSlide() {
    return `\\begin{frame}{Our Approach}
\\begin{enumerate}
  \\item \\textbf{Behavioral Fingerprinting}: Extract entropy-based features
  \\item \\textbf{Contagion Graph}: Cluster similar IPs using LSH
  \\item \\textbf{Neural Predictor}: Online learning for adaptation
  \\item \\textbf{Threat Intelligence}: Detect temporal patterns
\\end{enumerate}

\\vspace{1em}

\\begin{block}{Novel Contribution}
First system to combine behavioral clustering with contagion-based propagation for distributed botnet detection
\\end{block}
\\end{frame}`;
  }
  
  _generateResultsSlide(results) {
    const datasets = results.multiDataset.datasets;
    const rows = datasets.map(ds => 
      `${ds.name} & ${ds.accuracy.toFixed(2)} & ${ds.f1Score.toFixed(2)} \\\\`
    ).join('\n');
    
    return `\\begin{frame}{Results: Multi-Dataset Evaluation}
\\begin{table}
\\centering
\\begin{tabular}{lcc}
\\toprule
Dataset & Accuracy & F1-Score \\\\
\\midrule
${rows}
\\bottomrule
\\end{tabular}
\\end{table}

\\vspace{1em}

\\textbf{Key Finding:} Consistent performance across diverse datasets demonstrates strong generalization
\\end{frame}`;
  }
}
```

#### Poster Generator


```javascript
class PosterGenerator {
  /**
   * Generate academic conference poster
   * @param {EvaluationResults} results
   * @returns {string} LaTeX poster source
   */
  generate(results) {
    return `\\documentclass[25pt, a0paper, portrait]{tikzposter}
\\usepackage{graphicx}
\\usepackage{booktabs}
\\usepackage{amsmath}

\\title{SENTINEL: Behavioral Contagion Graph for Distributed DDoS Detection}
\\author{Author Name}
\\institute{Institution}

\\begin{document}

\\maketitle

\\begin{columns}
  \\column{0.5}
  
  \\block{Motivation}{
    Traditional DDoS defenses fail against distributed botnets that:
    \\begin{itemize}
      \\item Stay under per-IP rate limits
      \\item Coordinate attacks across many IPs
      \\item Adapt to detection mechanisms
    \\end{itemize}
    
    \\textbf{Key Insight:} Bots share behavioral patterns
  }
  
  \\block{Approach}{
    \\begin{center}
    \\includegraphics[width=0.9\\linewidth]{figures/architecture.pdf}
    \\end{center}
    
    \\textbf{Four-Layer Defense:}
    \\begin{enumerate}
      \\item Behavioral Fingerprinting (entropy-based)
      \\item Contagion Graph (LSH-accelerated clustering)
      \\item Neural Predictor (online learning)
      \\item Adaptive Threat Intelligence
    \\end{enumerate}
  }
  
  \\column{0.5}
  
  \\block{Results}{
    ${this._generateResultsTable(results)}
    
    \\vspace{1em}
    
    \\begin{center}
    \\includegraphics[width=0.9\\linewidth]{figures/roc-curve.pdf}
    \\end{center}
  }
  
  \\block{Key Contributions}{
    \\begin{itemize}
      \\item First contagion-based approach for distributed botnet detection
      \\item LSH optimization reduces complexity from $O(N^2)$ to $O(\\log N)$
      \\item 96\\% accuracy across multiple datasets
      \\item Open-source implementation available
    \\end{itemize}
    
    \\vspace{1em}
    
    \\begin{center}
    \\includegraphics[width=0.3\\linewidth]{figures/qr-code.pdf}
    
    \\textbf{github.com/matthewvaishnav/sentinel}
    \\end{center}
  }
\\end{columns}

\\end{document}`;
  }
  
  _generateResultsTable(results) {
    const datasets = results.multiDataset.datasets;
    const rows = datasets.map(ds => 
      `${ds.name} & ${ds.accuracy.toFixed(2)} & ${ds.precision.toFixed(2)} & ${ds.recall.toFixed(2)} \\\\`
    ).join('\n');
    
    return `\\begin{table}
\\centering
\\begin{tabular}{lccc}
\\toprule
Dataset & Accuracy & Precision & Recall \\\\
\\midrule
${rows}
\\bottomrule
\\end{tabular}
\\end{table}`;
  }
}
```

#### Interactive Visualization

```javascript
class InteractiveVisualization {
  /**
   * Generate interactive HTML page with D3.js charts
   * @param {EvaluationResults} results
   * @returns {string} HTML page
   */
  generate(results) {
    return `<!DOCTYPE html>
<html>
<head>
  <title>SENTINEL Interactive Results</title>
  <script src="https://d3js.org/d3.v7.min.js"></script>
  <style>
    body { font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif; margin: 0; padding: 20px; }
    .container { max-width: 1400px; margin: 0 auto; }
    .chart { margin: 30px 0; padding: 20px; background: #f5f5f5; border-radius: 8px; }
    .controls { margin: 20px 0; }
    select, button { padding: 10px; margin: 5px; font-size: 14px; }
  </style>
</head>
<body>
  <div class="container">
    <h1>SENTINEL: Interactive Evaluation Results</h1>
    
    <div class="controls">
      <label>Dataset:</label>
      <select id="datasetSelector">
        ${results.multiDataset.datasets.map(ds => 
          `<option value="${ds.name}">${ds.name}</option>`
        ).join('')}
      </select>
      
      <label>Metric:</label>
      <select id="metricSelector">
        <option value="accuracy">Accuracy</option>
        <option value="precision">Precision</option>
        <option value="recall">Recall</option>
        <option value="f1Score">F1-Score</option>
      </select>
    </div>
    
    <div class="chart" id="rocChart"></div>
    <div class="chart" id="prChart"></div>
    <div class="chart" id="confusionMatrix"></div>
    <div class="chart" id="ablationChart"></div>
  </div>
  
  <script>
    const results = ${JSON.stringify(results)};
    
    // ROC Curve
    function drawROC(dataset) {
      const data = results.multiDataset.datasets.find(d => d.name === dataset).roc;
      
      const margin = {top: 20, right: 20, bottom: 50, left: 50};
      const width = 600 - margin.left - margin.right;
      const height = 400 - margin.top - margin.bottom;
      
      d3.select("#rocChart").html("");
      
      const svg = d3.select("#rocChart")
        .append("svg")
        .attr("width", width + margin.left + margin.right)
        .attr("height", height + margin.top + margin.bottom)
        .append("g")
        .attr("transform", \`translate(\${margin.left},\${margin.top})\`);
      
      const x = d3.scaleLinear().domain([0, 1]).range([0, width]);
      const y = d3.scaleLinear().domain([0, 1]).range([height, 0]);
      
      const line = d3.line()
        .x(d => x(d.fpr))
        .y(d => y(d.tpr));
      
      svg.append("path")
        .datum(data.points)
        .attr("fill", "none")
        .attr("stroke", "#0066cc")
        .attr("stroke-width", 2)
        .attr("d", line);
      
      svg.append("g")
        .attr("transform", \`translate(0,\${height})\`)
        .call(d3.axisBottom(x));
      
      svg.append("g")
        .call(d3.axisLeft(y));
      
      svg.append("text")
        .attr("x", width / 2)
        .attr("y", height + 40)
        .style("text-anchor", "middle")
        .text("False Positive Rate");
      
      svg.append("text")
        .attr("transform", "rotate(-90)")
        .attr("y", -40)
        .attr("x", -height / 2)
        .style("text-anchor", "middle")
        .text("True Positive Rate");
      
      svg.append("text")
        .attr("x", width / 2)
        .attr("y", -5)
        .style("text-anchor", "middle")
        .style("font-weight", "bold")
        .text(\`ROC Curve (AUC = \${data.auc.toFixed(3)})\`);
    }
    
    // Initialize with first dataset
    drawROC(results.multiDataset.datasets[0].name);
    
    // Update on selection change
    document.getElementById('datasetSelector').addEventListener('change', (e) => {
      drawROC(e.target.value);
    });
  </script>
</body>
</html>`;
  }
}
```

### 6. Reproducibility Infrastructure

#### Docker Configuration


```dockerfile
# Dockerfile for reproducible SENTINEL experiments
FROM node:18-bullseye

# Install system dependencies
RUN apt-get update && apt-get install -y \
    python3 \
    python3-pip \
    redis-server \
    texlive-full \
    && rm -rf /var/lib/apt/lists/*

# Install Python packages for data processing
RUN pip3 install numpy pandas scipy matplotlib seaborn

# Set working directory
WORKDIR /sentinel

# Copy package files
COPY package*.json ./

# Install Node dependencies with exact versions
RUN npm ci

# Copy source code
COPY . .

# Copy datasets
COPY datasets/ /sentinel/datasets/

# Set environment variables
ENV NODE_ENV=production
ENV REDIS_URL=redis://localhost:6379
ENV RANDOM_SEED=42

# Expose ports
EXPOSE 3000 6379

# Create entrypoint script
COPY docker/entrypoint.sh /entrypoint.sh
RUN chmod +x /entrypoint.sh

ENTRYPOINT ["/entrypoint.sh"]
CMD ["npm", "run", "experiments:all"]
```

```yaml
# docker-compose.yml for multi-container setup
version: '3.8'

services:
  redis:
    image: redis:7-alpine
    ports:
      - "6379:6379"
    volumes:
      - redis-data:/data
    command: redis-server --appendonly yes
    
  sentinel:
    build: .
    ports:
      - "3000:3000"
    depends_on:
      - redis
    environment:
      - REDIS_URL=redis://redis:6379
      - NODE_ENV=production
      - RANDOM_SEED=42
    volumes:
      - ./results:/sentinel/results
      - ./academic/output:/sentinel/academic/output
    command: npm run experiments:all
    
  jupyter:
    image: jupyter/scipy-notebook:latest
    ports:
      - "8888:8888"
    volumes:
      - ./results:/home/jovyan/results
      - ./notebooks:/home/jovyan/notebooks
    command: start-notebook.sh --NotebookApp.token=''

volumes:
  redis-data:
```

```bash
#!/bin/bash
# entrypoint.sh - Container entry point

set -e

echo "Starting Redis..."
redis-server --daemonize yes

echo "Waiting for Redis to be ready..."
until redis-cli ping; do
  sleep 1
done

echo "Redis is ready!"

# Run experiments if requested
if [ "$1" = "experiments" ]; then
  echo "Running all experiments..."
  npm run experiments:all
  echo "Experiments complete! Results in /sentinel/results"
fi

# Execute the main command
exec "$@"
```

#### Experiment Scripts

```javascript
// academic/reproducibility/scripts/runAll.js
const { spawn } = require('child_process');
const fs = require('fs').promises;
const path = require('path');

class ExperimentRunner {
  constructor(config) {
    this.config = config;
    this.resultsDir = path.join(__dirname, '../../../results');
    this.seed = config.seed || 42;
  }
  
  async runAll() {
    console.log('Starting all experiments...');
    console.log(`Random seed: ${this.seed}`);
    
    // Create results directory
    await fs.mkdir(this.resultsDir, { recursive: true });
    
    const experiments = [
      { name: 'multi-dataset', script: './runMultiDataset.js' },
      { name: 'ablation', script: './runAblation.js' },
      { name: 'baseline', script: './runBaseline.js' },
      { name: 'statistical', script: './runStatistical.js' },
      { name: 'benchmarking', script: './runBenchmarking.js' }
    ];
    
    const results = {};
    
    for (const exp of experiments) {
      console.log(`\n=== Running ${exp.name} experiment ===`);
      const startTime = Date.now();
      
      try {
        results[exp.name] = await this._runExperiment(exp.script);
        const duration = ((Date.now() - startTime) / 1000).toFixed(2);
        console.log(`✓ ${exp.name} completed in ${duration}s`);
      } catch (error) {
        console.error(`✗ ${exp.name} failed:`, error.message);
        results[exp.name] = { error: error.message };
      }
    }
    
    // Save combined results
    const outputPath = path.join(this.resultsDir, 'all-results.json');
    await fs.writeFile(outputPath, JSON.stringify(results, null, 2));
    
    console.log(`\n=== All experiments complete ===`);
    console.log(`Results saved to: ${outputPath}`);
    
    // Generate summary report
    await this._generateSummary(results);
    
    return results;
  }
  
  async _runExperiment(scriptPath) {
    return new Promise((resolve, reject) => {
      const child = spawn('node', [scriptPath], {
        env: { ...process.env, RANDOM_SEED: this.seed },
        stdio: 'inherit'
      });
      
      let output = '';
      
      child.on('close', (code) => {
        if (code === 0) {
          resolve({ success: true, output });
        } else {
          reject(new Error(`Process exited with code ${code}`));
        }
      });
      
      child.on('error', reject);
    });
  }
  
  async _generateSummary(results) {
    const summary = [];
    
    summary.push('# Experiment Summary\n');
    summary.push(`Generated: ${new Date().toISOString()}\n`);
    summary.push(`Random Seed: ${this.seed}\n\n`);
    
    for (const [name, result] of Object.entries(results)) {
      summary.push(`## ${name}\n`);
      if (result.error) {
        summary.push(`**Status:** Failed\n`);
        summary.push(`**Error:** ${result.error}\n\n`);
      } else {
        summary.push(`**Status:** Success\n\n`);
      }
    }
    
    const summaryPath = path.join(this.resultsDir, 'SUMMARY.md');
    await fs.writeFile(summaryPath, summary.join(''));
  }
}

// Run if called directly
if (require.main === module) {
  const config = require('../../config/reproducibility.json');
  const runner = new ExperimentRunner(config);
  runner.runAll().catch(console.error);
}

module.exports = ExperimentRunner;
```

#### Seed Management

```javascript
// academic/reproducibility/seeds/seedManager.js
class SeedManager {
  constructor(baseSeed = 42) {
    this.baseSeed = baseSeed;
    this.seeds = {};
  }
  
  /**
   * Get deterministic seed for a specific component
   * @param {string} component - Component name
   * @returns {number} Seed value
   */
  getSeed(component) {
    if (!this.seeds[component]) {
      // Generate deterministic seed from base seed and component name
      this.seeds[component] = this._hashString(component, this.baseSeed);
    }
    return this.seeds[component];
  }
  
  /**
   * Set seed for random number generator
   * @param {string} component - Component name
   */
  setSeed(component) {
    const seed = this.getSeed(component);
    
    // Set Math.random seed (requires seeded-random or similar)
    if (global.seedrandom) {
      Math.random = global.seedrandom(seed);
    }
    
    return seed;
  }
  
  /**
   * Get all seeds for documentation
   * @returns {Object} Map of component to seed
   */
  getAllSeeds() {
    return { ...this.seeds, baseSeed: this.baseSeed };
  }
  
  _hashString(str, seed) {
    let hash = seed;
    for (let i = 0; i < str.length; i++) {
      hash = ((hash << 5) - hash) + str.charCodeAt(i);
      hash = hash & hash; // Convert to 32-bit integer
    }
    return Math.abs(hash);
  }
}

module.exports = SeedManager;
```

### 7. Benchmarking Suite

#### Performance Benchmarking


```javascript
// academic/benchmarking/latency/latencyTest.js
class LatencyBenchmark {
  constructor(sentinel) {
    this.sentinel = sentinel;
  }
  
  /**
   * Measure request processing latency
   * @param {number} numRequests - Number of requests to test
   * @returns {LatencyResults}
   */
  async run(numRequests = 10000) {
    const latencies = [];
    
    console.log(`Running latency benchmark with ${numRequests} requests...`);
    
    for (let i = 0; i < numRequests; i++) {
      const request = this._generateRequest();
      
      const start = process.hrtime.bigint();
      await this.sentinel.processRequest(request);
      const end = process.hrtime.bigint();
      
      const latencyNs = Number(end - start);
      latencies.push(latencyNs / 1000000); // Convert to milliseconds
      
      if (i % 1000 === 0) {
        console.log(`Progress: ${i}/${numRequests}`);
      }
    }
    
    return this._calculateStats(latencies);
  }
  
  _calculateStats(latencies) {
    latencies.sort((a, b) => a - b);
    
    const sum = latencies.reduce((a, b) => a + b, 0);
    const mean = sum / latencies.length;
    
    const variance = latencies.reduce((sum, lat) => 
      sum + Math.pow(lat - mean, 2), 0) / latencies.length;
    const stddev = Math.sqrt(variance);
    
    return {
      mean,
      median: latencies[Math.floor(latencies.length / 2)],
      p95: latencies[Math.floor(latencies.length * 0.95)],
      p99: latencies[Math.floor(latencies.length * 0.99)],
      min: latencies[0],
      max: latencies[latencies.length - 1],
      stddev,
      samples: latencies.length
    };
  }
  
  _generateRequest() {
    return {
      ip: `192.168.${Math.floor(Math.random() * 255)}.${Math.floor(Math.random() * 255)}`,
      path: `/api/endpoint${Math.floor(Math.random() * 10)}`,
      method: 'GET',
      headers: {
        'user-agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64)',
        'accept-language': 'en-US,en;q=0.9'
      }
    };
  }
}
```

#### Throughput Testing

```javascript
// academic/benchmarking/throughput/throughputTest.js
class ThroughputBenchmark {
  constructor(sentinel) {
    this.sentinel = sentinel;
  }
  
  /**
   * Measure requests per second at various load levels
   * @returns {ThroughputResults}
   */
  async run() {
    const loadLevels = [100, 500, 1000, 5000, 10000];
    const results = [];
    
    for (const targetRPS of loadLevels) {
      console.log(`\nTesting throughput at ${targetRPS} RPS...`);
      const result = await this._testLoadLevel(targetRPS);
      results.push({ targetRPS, ...result });
    }
    
    return {
      results,
      maxThroughput: Math.max(...results.map(r => r.actualRPS)),
      saturationPoint: this._findSaturationPoint(results)
    };
  }
  
  async _testLoadLevel(targetRPS, duration = 10000) {
    const intervalMs = 1000 / targetRPS;
    const startTime = Date.now();
    let completed = 0;
    let errors = 0;
    
    const interval = setInterval(async () => {
      try {
        const request = this._generateRequest();
        await this.sentinel.processRequest(request);
        completed++;
      } catch (error) {
        errors++;
      }
    }, intervalMs);
    
    // Run for specified duration
    await new Promise(resolve => setTimeout(resolve, duration));
    clearInterval(interval);
    
    const elapsed = Date.now() - startTime;
    const actualRPS = (completed / elapsed) * 1000;
    
    return {
      actualRPS,
      completed,
      errors,
      errorRate: errors / (completed + errors),
      duration: elapsed
    };
  }
  
  _findSaturationPoint(results) {
    // Find point where actual RPS stops increasing linearly
    for (let i = 1; i < results.length; i++) {
      const prev = results[i - 1];
      const curr = results[i];
      
      const expectedIncrease = curr.targetRPS - prev.targetRPS;
      const actualIncrease = curr.actualRPS - prev.actualRPS;
      
      // If actual increase is less than 80% of expected, we've saturated
      if (actualIncrease < expectedIncrease * 0.8) {
        return prev.actualRPS;
      }
    }
    
    return results[results.length - 1].actualRPS;
  }
  
  _generateRequest() {
    return {
      ip: `192.168.${Math.floor(Math.random() * 255)}.${Math.floor(Math.random() * 255)}`,
      path: `/api/endpoint${Math.floor(Math.random() * 10)}`,
      method: 'GET',
      headers: {
        'user-agent': 'Mozilla/5.0',
        'accept-language': 'en-US'
      }
    };
  }
}
```

#### Resource Monitoring

```javascript
// academic/benchmarking/resources/resourceMonitor.js
const os = require('os');
const v8 = require('v8');

class ResourceMonitor {
  constructor(intervalMs = 1000) {
    this.intervalMs = intervalMs;
    this.samples = [];
    this.monitoring = false;
  }
  
  /**
   * Start monitoring resource usage
   */
  start() {
    this.monitoring = true;
    this.samples = [];
    
    this.interval = setInterval(() => {
      if (this.monitoring) {
        this.samples.push(this._collectSample());
      }
    }, this.intervalMs);
  }
  
  /**
   * Stop monitoring and return results
   * @returns {ResourceStats}
   */
  stop() {
    this.monitoring = false;
    clearInterval(this.interval);
    
    return this._calculateStats();
  }
  
  _collectSample() {
    const memUsage = process.memoryUsage();
    const cpuUsage = process.cpuUsage();
    
    return {
      timestamp: Date.now(),
      memory: {
        heapUsed: memUsage.heapUsed,
        heapTotal: memUsage.heapTotal,
        external: memUsage.external,
        rss: memUsage.rss
      },
      cpu: {
        user: cpuUsage.user,
        system: cpuUsage.system
      },
      system: {
        loadAvg: os.loadavg(),
        freeMem: os.freemem(),
        totalMem: os.totalmem()
      }
    };
  }
  
  _calculateStats() {
    if (this.samples.length === 0) {
      return null;
    }
    
    const heapUsed = this.samples.map(s => s.memory.heapUsed);
    const rss = this.samples.map(s => s.memory.rss);
    
    return {
      memory: {
        heapUsed: {
          min: Math.min(...heapUsed),
          max: Math.max(...heapUsed),
          avg: heapUsed.reduce((a, b) => a + b, 0) / heapUsed.length
        },
        rss: {
          min: Math.min(...rss),
          max: Math.max(...rss),
          avg: rss.reduce((a, b) => a + b, 0) / rss.length
        }
      },
      duration: this.samples[this.samples.length - 1].timestamp - this.samples[0].timestamp,
      samples: this.samples.length,
      rawSamples: this.samples
    };
  }
  
  /**
   * Generate resource usage chart
   * @returns {string} Chart data for plotting
   */
  generateChart() {
    const data = this.samples.map(s => ({
      time: (s.timestamp - this.samples[0].timestamp) / 1000, // seconds
      heapMB: s.memory.heapUsed / 1024 / 1024,
      rssMB: s.memory.rss / 1024 / 1024
    }));
    
    return JSON.stringify(data, null, 2);
  }
}

module.exports = ResourceMonitor;
```

### 8. Ethics Analysis

#### False Positive Impact Analysis


```javascript
// academic/ethics/falsePositives/impactAnalysis.js
class FalsePositiveImpactAnalysis {
  /**
   * Analyze impact of false positives
   * @param {EvaluationResults} results
   * @param {Object} trafficStats - Real-world traffic statistics
   * @returns {ImpactAnalysis}
   */
  analyze(results, trafficStats) {
    const fpRate = this._calculateFPRate(results);
    const impact = this._estimateUserImpact(fpRate, trafficStats);
    const scenarios = this._analyzeScenarios(fpRate);
    const mitigations = this._recommendMitigations(fpRate);
    
    return {
      falsePositiveRate: fpRate,
      estimatedImpact: impact,
      criticalScenarios: scenarios,
      mitigationStrategies: mitigations,
      industryComparison: this._compareToIndustry(fpRate)
    };
  }
  
  _calculateFPRate(results) {
    const cm = results.confusionMatrix;
    return cm.fp / (cm.fp + cm.tn);
  }
  
  _estimateUserImpact(fpRate, trafficStats) {
    const dailyLegitimateUsers = trafficStats.dailyUsers || 100000;
    const affectedUsers = Math.floor(dailyLegitimateUsers * fpRate);
    
    // Estimate business impact
    const avgRevenuePerUser = trafficStats.avgRevenuePerUser || 5;
    const potentialRevenueLoss = affectedUsers * avgRevenuePerUser;
    
    return {
      affectedUsersPerDay: affectedUsers,
      affectedUsersPerMonth: affectedUsers * 30,
      potentialDailyRevenueLoss: potentialRevenueLoss,
      potentialMonthlyRevenueLoss: potentialRevenueLoss * 30,
      userExperienceImpact: this._categorizeImpact(fpRate)
    };
  }
  
  _categorizeImpact(fpRate) {
    if (fpRate < 0.01) return 'Minimal - Acceptable for production';
    if (fpRate < 0.05) return 'Low - Requires monitoring';
    if (fpRate < 0.10) return 'Moderate - Needs improvement';
    return 'High - Not suitable for production';
  }
  
  _analyzeScenarios(fpRate) {
    return [
      {
        scenario: 'E-commerce checkout',
        severity: 'Critical',
        description: 'Legitimate customer blocked during checkout',
        impact: 'Direct revenue loss, customer frustration',
        likelihood: fpRate > 0.05 ? 'High' : 'Low'
      },
      {
        scenario: 'API access for mobile app',
        severity: 'High',
        description: 'Mobile app users unable to access service',
        impact: 'App store negative reviews, user churn',
        likelihood: fpRate > 0.03 ? 'Medium' : 'Low'
      },
      {
        scenario: 'Content browsing',
        severity: 'Medium',
        description: 'Users blocked while reading articles',
        impact: 'Reduced engagement, bounce rate increase',
        likelihood: fpRate > 0.02 ? 'Medium' : 'Low'
      },
      {
        scenario: 'Corporate network users',
        severity: 'High',
        description: 'Entire corporate network blocked due to shared IP',
        impact: 'Business disruption, support tickets',
        likelihood: fpRate > 0.01 ? 'Medium' : 'Low'
      }
    ];
  }
  
  _recommendMitigations(fpRate) {
    const strategies = [];
    
    if (fpRate > 0.05) {
      strategies.push({
        priority: 'High',
        strategy: 'Implement progressive challenges',
        description: 'Use CAPTCHA before blocking to reduce false positives',
        expectedReduction: '50-70%'
      });
    }
    
    if (fpRate > 0.03) {
      strategies.push({
        priority: 'High',
        strategy: 'Add allowlist for known good IPs',
        description: 'Maintain list of verified legitimate users/services',
        expectedReduction: '20-30%'
      });
    }
    
    strategies.push({
      priority: 'Medium',
      strategy: 'Implement feedback mechanism',
      description: 'Allow users to report false positives',
      expectedReduction: 'Improves over time'
    });
    
    strategies.push({
      priority: 'Medium',
      strategy: 'Adjust detection thresholds',
      description: 'Fine-tune thresholds based on traffic patterns',
      expectedReduction: '10-20%'
    });
    
    return strategies;
  }
  
  _compareToIndustry(fpRate) {
    const benchmarks = [
      { system: 'Cloudflare', fpRate: 0.001, source: 'Industry report 2023' },
      { system: 'AWS Shield', fpRate: 0.005, source: 'AWS documentation' },
      { system: 'Akamai', fpRate: 0.002, source: 'Akamai whitepaper' },
      { system: 'Academic baseline', fpRate: 0.05, source: 'Research papers' }
    ];
    
    return {
      sentinelFPRate: fpRate,
      industryBenchmarks: benchmarks,
      ranking: this._rankAgainstIndustry(fpRate, benchmarks)
    };
  }
  
  _rankAgainstIndustry(fpRate, benchmarks) {
    const better = benchmarks.filter(b => fpRate < b.fpRate).length;
    const total = benchmarks.length;
    
    if (better === total) return 'Best in class';
    if (better >= total * 0.75) return 'Above average';
    if (better >= total * 0.5) return 'Average';
    return 'Below average';
  }
}
```

#### Privacy Analysis

```javascript
// academic/ethics/privacy/privacyAnalysis.js
class PrivacyAnalysis {
  /**
   * Analyze privacy implications of SENTINEL
   * @returns {PrivacyReport}
   */
  analyze() {
    return {
      dataCollection: this._analyzeDataCollection(),
      retention: this._analyzeRetention(),
      risks: this._identifyRisks(),
      compliance: this._assessCompliance(),
      recommendations: this._generateRecommendations()
    };
  }
  
  _analyzeDataCollection() {
    return {
      collected: [
        {
          dataType: 'IP Address',
          purpose: 'Identify and track request sources',
          sensitivity: 'Medium',
          piiStatus: 'Potentially PII under GDPR',
          retention: '1 hour (non-bots), 24 hours (confirmed bots)'
        },
        {
          dataType: 'Request Timestamps',
          purpose: 'Calculate timing patterns',
          sensitivity: 'Low',
          piiStatus: 'Not PII',
          retention: '1 hour'
        },
        {
          dataType: 'User-Agent String',
          purpose: 'Behavioral fingerprinting',
          sensitivity: 'Low',
          piiStatus: 'Not PII',
          retention: '1 hour'
        },
        {
          dataType: 'Request Paths',
          purpose: 'Detect scanning patterns',
          sensitivity: 'Medium',
          piiStatus: 'May contain sensitive info',
          retention: '1 hour'
        },
        {
          dataType: 'HTTP Headers',
          purpose: 'Behavioral analysis',
          sensitivity: 'Low',
          piiStatus: 'Not PII',
          retention: '1 hour'
        }
      ],
      notCollected: [
        'Request bodies',
        'Authentication credentials',
        'Cookies',
        'Session data',
        'User identifiers beyond IP'
      ]
    };
  }
  
  _analyzeRetention() {
    return {
      policy: 'Minimal retention with automatic cleanup',
      details: [
        {
          dataType: 'Behavioral profiles (non-bots)',
          retention: '1 hour',
          justification: 'Sufficient for pattern detection'
        },
        {
          dataType: 'Confirmed bot IPs',
          retention: '24 hours',
          justification: 'Prevent immediate re-attack'
        },
        {
          dataType: 'Aggregate statistics',
          retention: 'Indefinite',
          justification: 'No PII, used for system improvement'
        }
      ],
      automaticDeletion: true,
      userDeletionRequest: 'Supported via API'
    };
  }
  
  _identifyRisks() {
    return [
      {
        risk: 'IP address tracking',
        severity: 'Medium',
        description: 'IP addresses can be used to track users across sessions',
        mitigation: 'Short retention period, no cross-session correlation',
        residualRisk: 'Low'
      },
      {
        risk: 'Behavioral profiling',
        severity: 'Medium',
        description: 'Behavioral patterns could reveal user habits',
        mitigation: 'Profiles deleted after 1 hour, no long-term storage',
        residualRisk: 'Low'
      },
      {
        risk: 'False positive discrimination',
        severity: 'High',
        description: 'Legitimate users from certain regions may be disproportionately blocked',
        mitigation: 'Regular bias audits, adjustable thresholds',
        residualRisk: 'Medium'
      },
      {
        risk: 'Data breach',
        severity: 'Medium',
        description: 'Stored IP addresses could be exposed in breach',
        mitigation: 'Encryption at rest, minimal retention',
        residualRisk: 'Low'
      }
    ];
  }
  
  _assessCompliance() {
    return {
      gdpr: {
        compliant: 'Partial',
        requirements: [
          { requirement: 'Lawful basis', status: 'Met', basis: 'Legitimate interest (security)' },
          { requirement: 'Data minimization', status: 'Met', details: 'Only essential data collected' },
          { requirement: 'Storage limitation', status: 'Met', details: 'Short retention periods' },
          { requirement: 'Right to erasure', status: 'Met', details: 'API endpoint for deletion' },
          { requirement: 'Data portability', status: 'Not applicable', details: 'No user accounts' },
          { requirement: 'Privacy by design', status: 'Met', details: 'Automatic cleanup, minimal collection' }
        ],
        gaps: [
          'No explicit consent mechanism (relies on legitimate interest)',
          'No data processing agreement for Redis storage'
        ]
      },
      ccpa: {
        compliant: 'Yes',
        details: 'No sale of personal information, deletion supported'
      },
      hipaa: {
        compliant: 'Not applicable',
        details: 'No health information collected'
      }
    };
  }
  
  _generateRecommendations() {
    return [
      {
        priority: 'High',
        recommendation: 'Implement IP anonymization',
        description: 'Hash IP addresses with daily rotating salt',
        benefit: 'Reduces PII exposure while maintaining functionality'
      },
      {
        priority: 'High',
        recommendation: 'Add privacy policy disclosure',
        description: 'Document data collection and retention in privacy policy',
        benefit: 'GDPR transparency requirement'
      },
      {
        priority: 'Medium',
        recommendation: 'Implement differential privacy',
        description: 'Add noise to aggregate statistics',
        benefit: 'Prevents inference attacks on aggregate data'
      },
      {
        priority: 'Medium',
        recommendation: 'Regular bias audits',
        description: 'Monitor false positive rates by geographic region',
        benefit: 'Detect and mitigate discriminatory patterns'
      },
      {
        priority: 'Low',
        recommendation: 'Encrypted Redis storage',
        description: 'Enable Redis encryption at rest',
        benefit: 'Additional protection against data breaches'
      }
    ];
  }
}
```

## Data Models

### Evaluation Results Schema


```typescript
interface EvaluationResults {
  multiDataset: {
    datasets: Array<{
      name: string;
      accuracy: number;
      precision: number;
      recall: number;
      f1Score: number;
      specificity: number;
      confusionMatrix: {
        tp: number;
        tn: number;
        fp: number;
        fn: number;
      };
      roc: {
        points: Array<{ threshold: number; tpr: number; fpr: number }>;
        auc: number;
      };
      pr: {
        points: Array<{ threshold: number; precision: number; recall: number }>;
        avgPrecision: number;
      };
    }>;
  };
  
  baseline: {
    sentinel: {
      accuracy: number;
      precision: number;
      recall: number;
      f1Score: number;
    };
    methods: Array<{
      name: string;
      accuracy: number;
      precision: number;
      recall: number;
      f1Score: number;
    }>;
  };
  
  ablation: {
    full: {
      accuracy: number;
      precision: number;
      recall: number;
      f1Score: number;
    };
    components: Array<{
      name: string;
      f1Score: number;
      drop: number;
      relativeDrop: number;
    }>;
    componentRanking: Array<{
      component: string;
      absoluteDrop: number;
      relativeDrop: number;
    }>;
  };
  
  statistical: {
    comparisons: Array<{
      method: string;
      tStatistic: number;
      pValue: number;
      significant: boolean;
      confidenceInterval: {
        lower: number;
        upper: number;
        confidence: number;
      };
    }>;
  };
  
  benchmarking: {
    latency: {
      mean: number;
      median: number;
      p95: number;
      p99: number;
      min: number;
      max: number;
      stddev: number;
    };
    throughput: {
      results: Array<{
        targetRPS: number;
        actualRPS: number;
        completed: number;
        errors: number;
        errorRate: number;
      }>;
      maxThroughput: number;
      saturationPoint: number;
    };
    resources: {
      memory: {
        heapUsed: { min: number; max: number; avg: number };
        rss: { min: number; max: number; avg: number };
      };
      duration: number;
      samples: number;
    };
  };
}
```

### Configuration Schema

```typescript
interface AcademicConfig {
  datasets: {
    sources: Array<{
      name: string;
      type: 'cicddos2019' | 'caida' | 'unsw';
      path: string;
      enabled: boolean;
    }>;
    cache: {
      enabled: boolean;
      directory: string;
    };
  };
  
  evaluation: {
    testSplit: number; // 0.0 to 1.0
    crossValidation: {
      enabled: boolean;
      folds: number;
    };
    metrics: string[]; // ['accuracy', 'precision', 'recall', 'f1']
    curves: {
      roc: boolean;
      pr: boolean;
      thresholdStep: number;
    };
  };
  
  statistical: {
    confidenceLevel: number; // 0.95
    significanceLevel: number; // 0.05
    multipleComparisonCorrection: 'bonferroni' | 'holm' | 'none';
  };
  
  paper: {
    template: 'acm' | 'ieee';
    title: string;
    authors: Array<{
      name: string;
      affiliation: string;
      email: string;
    }>;
    outputDirectory: string;
  };
  
  reproducibility: {
    seed: number;
    docker: {
      enabled: boolean;
      baseImage: string;
    };
    deterministic: boolean;
  };
  
  benchmarking: {
    latency: {
      enabled: boolean;
      numRequests: number;
    };
    throughput: {
      enabled: boolean;
      loadLevels: number[];
      duration: number;
    };
    resources: {
      enabled: boolean;
      intervalMs: number;
    };
  };
}
```

## Error Handling

### Error Categories

1. **Data Loading Errors**
   - Missing dataset files
   - Corrupted data
   - Incompatible formats
   - Mitigation: Validate checksums, provide clear error messages, fallback to cached data

2. **Computation Errors**
   - Numerical instability in statistical tests
   - Division by zero in metric calculations
   - Memory exhaustion with large datasets
   - Mitigation: Input validation, graceful degradation, chunked processing

3. **Generation Errors**
   - LaTeX compilation failures
   - Missing templates
   - Invalid figure references
   - Mitigation: Template validation, dependency checking, fallback to plain text

4. **Reproducibility Errors**
   - Seed not set correctly
   - Non-deterministic operations
   - Environment differences
   - Mitigation: Seed validation, deterministic mode enforcement, environment documentation

### Error Handling Strategy

```javascript
class AcademicEnhancementError extends Error {
  constructor(message, category, details) {
    super(message);
    this.name = 'AcademicEnhancementError';
    this.category = category;
    this.details = details;
    this.timestamp = new Date().toISOString();
  }
}

class ErrorHandler {
  static handle(error, context) {
    // Log error with context
    console.error(`[${error.category}] ${error.message}`);
    console.error('Context:', context);
    console.error('Details:', error.details);
    
    // Attempt recovery based on category
    switch (error.category) {
      case 'data_loading':
        return this._handleDataLoadingError(error, context);
      case 'computation':
        return this._handleComputationError(error, context);
      case 'generation':
        return this._handleGenerationError(error, context);
      default:
        throw error;
    }
  }
  
  static _handleDataLoadingError(error, context) {
    // Try cached version
    if (context.cacheAvailable) {
      console.log('Falling back to cached data...');
      return context.loadFromCache();
    }
    throw error;
  }
  
  static _handleComputationError(error, context) {
    // Use fallback computation method
    if (context.fallbackMethod) {
      console.log('Using fallback computation method...');
      return context.fallbackMethod();
    }
    throw error;
  }
  
  static _handleGenerationError(error, context) {
    // Generate simplified version
    if (context.simplifiedMode) {
      console.log('Generating simplified output...');
      return context.generateSimplified();
    }
    throw error;
  }
}
```

## Testing Strategy

### Unit Tests

Each component will have comprehensive unit tests:

1. **Dataset Loaders**: Test parsing, normalization, feature extraction
2. **Metrics Calculators**: Test accuracy, precision, recall, F1, ROC, PR curves
3. **Statistical Tests**: Test t-tests, confidence intervals, corrections
4. **Generators**: Test LaTeX generation, documentation generation, diagram generation

### Integration Tests

Test interactions between components:

1. **End-to-End Evaluation**: Load dataset → evaluate → generate results
2. **Paper Generation**: Results → LaTeX → PDF compilation
3. **Reproducibility**: Run experiments → validate determinism

### Property-Based Tests

This feature is NOT suitable for property-based testing because:

1. **Infrastructure as Code**: Docker configurations are declarative, not functional
2. **Document Generation**: LaTeX templates are static content, not algorithms
3. **Statistical Tests**: Already validated by mathematical proofs
4. **One-Shot Operations**: Paper generation, poster creation are single-execution tasks

Instead, we use:
- **Snapshot tests** for LaTeX output
- **Schema validation** for JSON configurations
- **Example-based tests** for statistical calculations with known inputs/outputs

### Test Coverage Goals

- Unit test coverage: >90%
- Integration test coverage: >80%
- All statistical formulas validated against known results
- All LaTeX templates compile without errors

## Implementation Plan

### Phase 1: Foundation (Weeks 1-2)

1. Set up directory structure
2. Implement dataset loaders for CIC-DDoS2019
3. Implement feature extraction and normalization
4. Create configuration system
5. Write unit tests for data processing

### Phase 2: Evaluation Framework (Weeks 3-4)

1. Implement metrics calculators
2. Implement statistical tests
3. Implement ablation study framework
4. Implement baseline methods
5. Write unit tests for evaluation

### Phase 3: Generation (Weeks 5-6)

1. Implement LaTeX paper generator
2. Implement API documentation generator
3. Implement diagram generator
4. Create LaTeX templates
5. Write tests for generators

### Phase 4: Presentation (Week 7)

1. Implement slide generator
2. Implement poster generator
3. Implement interactive visualization
4. Create presentation templates

### Phase 5: Reproducibility (Week 8)

1. Create Docker configuration
2. Implement experiment scripts
3. Implement seed management
4. Create replication guide
5. Test full reproducibility

### Phase 6: Benchmarking & Ethics (Week 9)

1. Implement latency benchmarking
2. Implement throughput testing
3. Implement resource monitoring
4. Implement ethics analysis
5. Generate ethics documentation

### Phase 7: Integration & Testing (Week 10)

1. Integration testing
2. End-to-end testing
3. Documentation review
4. Bug fixes
5. Performance optimization

### Phase 8: Validation (Week 11)

1. Run full evaluation on all datasets
2. Generate complete paper
3. Validate reproducibility
4. Review all generated materials
5. Final adjustments

## Dependencies

### Node.js Packages

```json
{
  "dependencies": {
    "csv-parser": "^3.0.0",
    "d3": "^7.8.0",
    "jsdoc": "^4.0.0",
    "latex": "^0.1.0",
    "mathjs": "^11.11.0",
    "seedrandom": "^3.0.5"
  },
  "devDependencies": {
    "jest": "^29.7.0",
    "@types/node": "^20.0.0"
  }
}
```

### System Dependencies

- Node.js 18+
- Redis 7+
- LaTeX distribution (TeX Live or MiKTeX)
- Mermaid CLI (`npm install -g @mermaid-js/mermaid-cli`)
- Docker (for reproducibility)
- Python 3.8+ (for data processing scripts)

### Python Packages (for data processing)

```
numpy>=1.24.0
pandas>=2.0.0
scipy>=1.10.0
matplotlib>=3.7.0
seaborn>=0.12.0
```

## Performance Considerations

### Dataset Processing

- **Caching**: Processed datasets cached to disk to avoid reprocessing
- **Streaming**: Large datasets processed in chunks to avoid memory exhaustion
- **Parallel Processing**: Multiple datasets processed in parallel using worker threads

### Statistical Computations

- **Vectorization**: Use vectorized operations where possible
- **Approximations**: Use approximations for expensive operations (e.g., t-distribution CDF)
- **Memoization**: Cache results of expensive computations

### Document Generation

- **Template Caching**: LaTeX templates loaded once and reused
- **Incremental Generation**: Generate sections independently
- **Lazy Evaluation**: Only generate requested outputs

### Expected Performance

- Dataset loading: ~30 seconds per dataset
- Feature extraction: ~1 minute per 10,000 samples
- Evaluation: ~5 minutes per dataset
- Statistical tests: ~10 seconds
- Paper generation: ~30 seconds
- PDF compilation: ~1 minute
- Total end-to-end: ~30 minutes for complete academic package

## Security Considerations

### Data Privacy

- No PII collected beyond what SENTINEL already collects
- Dataset files stored locally, not transmitted
- Generated papers reviewed before publication to ensure no sensitive data

### Code Execution

- LaTeX compilation sandboxed to prevent arbitrary code execution
- User-provided templates validated before use
- Docker containers run with minimal privileges

### Dependency Security

- All dependencies pinned to specific versions
- Regular security audits using `npm audit`
- Docker base images from official sources only

## Deployment

### Local Development

```bash
# Install dependencies
npm install

# Run single experiment
node academic/cli.js run --experiment multi-dataset

# Generate paper
node academic/cli.js generate --type paper

# Run all experiments and generate everything
node academic/cli.js all
```

### Docker Deployment

```bash
# Build container
docker build -t sentinel-academic .

# Run experiments
docker run -v $(pwd)/results:/sentinel/results sentinel-academic

# Generate paper
docker run -v $(pwd)/results:/sentinel/results sentinel-academic npm run generate:paper
```

### CI/CD Integration

```yaml
# .github/workflows/academic.yml
name: Academic Evaluation

on:
  push:
    branches: [main]
  schedule:
    - cron: '0 0 * * 0'  # Weekly

jobs:
  evaluate:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v3
      - uses: actions/setup-node@v3
        with:
          node-version: 18
      - run: npm ci
      - run: npm run experiments:all
      - uses: actions/upload-artifact@v3
        with:
          name: evaluation-results
          path: results/
```

## Maintenance

### Regular Updates

- **Datasets**: Check for new versions of public datasets quarterly
- **Baselines**: Update baseline implementations as new methods published
- **Templates**: Update LaTeX templates to match current conference requirements
- **Dependencies**: Update dependencies monthly, test thoroughly

### Monitoring

- Track experiment runtime to detect performance regressions
- Monitor generated paper quality (compilation success, figure quality)
- Validate reproducibility regularly (monthly full reproduction)

### Documentation

- Keep README updated with latest results
- Document any changes to evaluation methodology
- Maintain changelog for academic enhancements

## Future Enhancements

### Potential Additions

1. **Additional Datasets**: UNSW-NB15, NSL-KDD, custom datasets
2. **More Baselines**: Commercial DDoS solutions, recent academic methods
3. **Advanced Visualizations**: 3D plots, animated diagrams, interactive dashboards
4. **Automated Paper Submission**: Direct submission to arXiv, conference systems
5. **Continuous Evaluation**: Automated weekly evaluation on new data
6. **A/B Testing Framework**: Compare different SENTINEL configurations
7. **Explainability**: SHAP values, feature importance analysis
8. **Meta-Analysis**: Compare SENTINEL to all published DDoS detection methods

### Research Directions

1. **Adversarial Robustness**: Test against adaptive attackers
2. **Transfer Learning**: Pre-train on one dataset, fine-tune on another
3. **Federated Learning**: Distributed training across multiple deployments
4. **Causal Analysis**: Identify causal relationships in behavioral features
5. **Theoretical Guarantees**: Prove bounds on detection accuracy

