# Benchmark Results

This document tracks performance benchmarks for SENTINEL. Use `scripts/benchmark.js` to run tests.

## How to run

```bash
node scripts/benchmark.js http://localhost:3000 30 50
```  
- 1st arg: target URL (default `http://localhost:3000/`)  
- 2nd arg: duration seconds (default 30)  
- 3rd arg: concurrency (default 50)

## Sample output

```
benchmark,1712054400000,http://localhost:3000/,30,50,1500,1495,5,3,127,20.33
```

## Goals
- 99th percentile latency < 100ms
- throughput > 2000 req/s on target infrastructure
- error rate < 0.1%
