/**
 * SENTINEL — Math Worker Pool
 * 
 * Round-robin worker thread pool to manage intensive asynchronous computations
 * under high-concurrency without spinning up endless new V8 threads.
 */

const { Worker } = require('worker_threads');
const path = require('path');
const log = require('../logger');
const os = require('os');

class WorkerPool {
  constructor(poolSize = Math.max(2, os.cpus().length - 1)) {
    this.workers = [];
    this.nextWorkerIdx = 0;
    this.queue = [];
    this.taskMap = new Map();
    this.taskIdGenerator = 0;
    this.isClosing = false;
    
    const workerPath = path.join(__dirname, 'mathWorker.js');

    for (let i = 0; i < poolSize; i++) {
        const worker = new Worker(workerPath);
        worker.on('message', (msg) => this._handleMessage(msg));
        worker.on('error', (err) => {
          if (!this.isClosing) log.error('MathWorker Error', err);
        });
        worker.on('exit', (code) => {
            if (code !== 0 && !this.isClosing) {
              log.error(`MathWorker stopped with exit code ${code}`);
            }
        });
        this.workers.push(worker);
    }

    log.info(`Initialized Worker Pool with ${poolSize} background threads`);
  }

  exec(task, payload) {
    return new Promise((resolve, reject) => {
      const id = ++this.taskIdGenerator;
      this.taskMap.set(id, { resolve, reject });
      
      const worker = this.workers[this.nextWorkerIdx];
      this.nextWorkerIdx = (this.nextWorkerIdx + 1) % this.workers.length;
      
      worker.postMessage({ id, task, payload });
    });
  }

  _handleMessage({ id, result, error }) {
    if (!this.taskMap.has(id)) return;
    const { resolve, reject } = this.taskMap.get(id);
    this.taskMap.delete(id);

    if (error) return reject(new Error(error));
    resolve(result);
  }
  
  close() {
    this.isClosing = true;
    return Promise.all(this.workers.map(w => w.terminate()));
  }
}

// Global Singleton Pool Instance
const mathPool = new WorkerPool();
module.exports = mathPool;
