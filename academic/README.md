# Academic Enhancements for SENTINEL

This directory contains the academic research infrastructure for transforming SENTINEL into a Harvard-level academic project suitable for publication at top-tier security conferences.

## Directory Structure

### `/datasets/`
Dataset processing and storage infrastructure
- `loaders/` - Dataset loaders implementing standardized DatasetLoader interface
  - `cicddos2019.js` - CIC-DDoS2019 dataset loader (behavioral features)
  - `caida.js` - CAIDA DDoS Attack 2007 dataset loader (packet-level)
  - `unsw.js` - UNSW-NB15 network intrusion dataset loader (flow-level)
- `processors/` - Feature extraction and normalization
- `cache/` - Processed dataset cache (JSON format)

**Quick Start:**
```javascript
const CICDDoS2019Loader = require('./datasets/loaders/cicddos2019');
const loader = new CICDDoS2019Loader();
const dataset = await loader.load('data/cicddos2019_mock.csv');
console.log(`Loaded ${dataset.samples.length} samples`);
```

See `datasets/loaders/README.md` for detailed documentation.

### `/evaluation/`
Evaluation framework for rigorous testing
- `metrics/` - Classification metrics, ROC/PR curves, confusion matrices
- `statistical/` - T-tests, confidence intervals, multiple comparison corrections
- `ablation/` - Component ablation study framework
- `baselines/` - Baseline method implementations
- `runner.js` - Experiment orchestration

### `/analysis/`
Mathematical and complexity analysis
- `complexity/` - Time and space complexity analysis
- `formulation/` - Mathematical problem formulation
- `limitations/` - Theoretical limitations analysis

### `/paper/`
Research paper generation
- `templates/` - LaTeX templates (ACM, IEEE)
- `sections/` - Section generators (abstract, intro, methodology, results, conclusion)
- `bibliography/` - BibTeX references
- `figures/` - Generated figures and charts
- `generator.js` - Main paper generator

### `/documentation/`
Comprehensive documentation generation
- `api/` - API documentation from JSDoc
- `diagrams/` - Architecture and system diagrams
- `guides/` - Deployment, contributing, replication guides
- `generator.js` - Main documentation generator

### `/presentation/`
Academic presentation materials
- `slides/` - LaTeX Beamer and PowerPoint slides
- `poster/` - Conference poster generation
- `video/` - Video walkthrough scripts
- `interactive/` - Interactive visualizations (D3.js)

### `/reproducibility/`
Reproducibility infrastructure
- `docker/` - Docker container configuration
- `scripts/` - Experiment reproduction scripts
- `seeds/` - Random seed management
- `validation/` - Result validation

### `/benchmarking/`
Performance benchmarking suite
- `latency/` - Latency measurement
- `throughput/` - Throughput testing
- `scalability/` - Scalability testing
- `resources/` - CPU/memory monitoring

### `/ethics/`
Ethical analysis and considerations
- `falsePositives/` - False positive impact analysis
- `privacy/` - Privacy considerations
- `misuse/` - Potential misuse analysis

### `/config/`
Configuration files for all components
- `datasets.json` - Dataset sources and settings
- `evaluation.json` - Evaluation parameters
- `paper.json` - Paper generation configuration
- `reproducibility.json` - Reproducibility settings

### `/output/`
Generated artifacts and results

## Getting Started

The academic enhancements follow an 11-week implementation plan covering:
1. Dataset processing infrastructure
2. Evaluation framework
3. Paper generation
4. Documentation generation
5. Presentation materials
6. Reproducibility infrastructure
7. Benchmarking suite
8. Ethics analysis

See `.kiro/specs/academic-enhancements/` for detailed requirements, design, and tasks.
