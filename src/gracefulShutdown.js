/**
 * SENTINEL — Graceful Shutdown System
 * 
 * Handles clean shutdown of the server on SIGTERM/SIGINT signals.
 * Ensures no dropped requests and preserves critical state.
 * 
 * Shutdown Sequence:
 * 1. Stop accepting new connections
 * 2. Close WebSocket connections gracefully
 * 3. Wait for in-flight HTTP requests to complete
 * 4. Persist critical state to disk
 * 5. Close all resources
 * 6. Exit process
 * 
 * Kubernetes Integration:
 * - Responds to SIGTERM from Kubernetes
 * - Allows time for load balancer to remove pod
 * - Ensures zero-downtime deployments
 */

const fs = require('fs');
const path = require('path');
const log = require('./logger');

class GracefulShutdownManager {
  constructor(config = {}) {
    this.isShuttingDown = false;
    this.shutdownTimeout = config.shutdownTimeout || 30000; // 30 seconds
    this.stateFile = config.stateFile || path.join(__dirname, '..', 'data', 'shutdown-state.json');
    this.components = {};
    this.inFlightRequests = 0;
    
    // Ensure data directory exists
    const dataDir = path.dirname(this.stateFile);
    if (!fs.existsSync(dataDir)) {
      fs.mkdirSync(dataDir, { recursive: true });
    }
    
    log.info('Graceful shutdown manager initialized', {
      component: 'shutdown',
      timeout: this.shutdownTimeout,
      stateFile: this.stateFile
    });
  }
  
  /**
   * Register components for shutdown
   * @param {Object} components - Components to manage during shutdown
   */
  registerComponents(components) {
    this.components = components;
    log.info('Components registered for graceful shutdown', {
      component: 'shutdown',
      componentCount: Object.keys(components).length,
      components: Object.keys(components)
    });
  }
  
  /**
   * Track in-flight request
   */
  trackRequest() {
    this.inFlightRequests++;
  }
  
  /**
   * Release in-flight request
   */
  releaseRequest() {
    this.inFlightRequests--;
  }
  
  /**
   * Get in-flight request count
   */
  getInFlightCount() {
    return this.inFlightRequests;
  }
  
  /**
   * Setup signal handlers
   */
  setupSignalHandlers() {
    // SIGTERM - Kubernetes sends this for graceful shutdown
    process.on('SIGTERM', () => {
      log.info('Received SIGTERM signal', { component: 'shutdown' });
      this.shutdown('SIGTERM');
    });
    
    // SIGINT - Ctrl+C in terminal
    process.on('SIGINT', () => {
      log.info('Received SIGINT signal', { component: 'shutdown' });
      this.shutdown('SIGINT');
    });
    
    // Uncaught exceptions
    process.on('uncaughtException', (error) => {
      log.error('Uncaught exception', {
        component: 'shutdown',
        error: error.message,
        stack: error.stack
      });
      this.shutdown('uncaughtException');
    });
    
    // Unhandled promise rejections
    process.on('unhandledRejection', (reason, promise) => {
      log.error('Unhandled promise rejection', {
        component: 'shutdown',
        reason: reason,
        promise: promise
      });
      this.shutdown('unhandledRejection');
    });
    
    log.info('Signal handlers registered', {
      component: 'shutdown',
      signals: ['SIGTERM', 'SIGINT', 'uncaughtException', 'unhandledRejection']
    });
  }
  
  /**
   * Perform graceful shutdown
   * @param {string} signal - Signal that triggered shutdown
   */
  async shutdown(signal) {
    if (this.isShuttingDown) {
      log.warn('Shutdown already in progress', { component: 'shutdown' });
      return;
    }
    
    this.isShuttingDown = true;
    const startTime = Date.now();
    
    log.info('Starting graceful shutdown', {
      component: 'shutdown',
      signal,
      inFlightRequests: this.inFlightRequests
    });
    
    try {
      // Step 1: Stop accepting new connections
      await this.stopAcceptingConnections();
      
      // Step 2: Close WebSocket connections
      await this.closeWebSocketConnections();
      
      // Step 3: Wait for in-flight requests
      await this.waitForInFlightRequests();
      
      // Step 4: Persist critical state
      await this.persistState();
      
      // Step 5: Close all resources
      await this.closeResources();
      
      const duration = Date.now() - startTime;
      log.info('Graceful shutdown complete', {
        component: 'shutdown',
        signal,
        durationMs: duration
      });
      
      // Exit cleanly
      process.exit(0);
      
    } catch (error) {
      log.error('Error during graceful shutdown', {
        component: 'shutdown',
        error: error.message,
        stack: error.stack
      });
      
      // Force exit after error
      process.exit(1);
    }
  }
  
  /**
   * Stop accepting new connections
   */
  async stopAcceptingConnections() {
    return new Promise((resolve) => {
      if (!this.components.server) {
        log.warn('HTTP server not registered', { component: 'shutdown' });
        return resolve();
      }
      
      this.components.server.close(() => {
        log.info('HTTP server stopped accepting connections', {
          component: 'shutdown'
        });
        resolve();
      });
      
      // Force close after timeout
      setTimeout(() => {
        log.warn('HTTP server close timeout, forcing', {
          component: 'shutdown'
        });
        resolve();
      }, 5000);
    });
  }
  
  /**
   * Close WebSocket connections gracefully
   */
  async closeWebSocketConnections() {
    if (!this.components.wss) {
      log.warn('WebSocket server not registered', { component: 'shutdown' });
      return;
    }
    
    const clientCount = this.components.wss.clients.size;
    log.info('Closing WebSocket connections', {
      component: 'shutdown',
      clientCount
    });
    
    // Send close message to all clients
    this.components.wss.clients.forEach(ws => {
      try {
        ws.close(1000, 'Server shutting down');
      } catch (error) {
        log.error('Error closing WebSocket', {
          component: 'shutdown',
          error: error.message
        });
      }
    });
    
    // Wait a bit for clients to close
    await this.sleep(1000);
    
    log.info('WebSocket connections closed', {
      component: 'shutdown',
      remainingClients: this.components.wss.clients.size
    });
  }
  
  /**
   * Wait for in-flight requests to complete
   */
  async waitForInFlightRequests() {
    const startTime = Date.now();
    const timeout = this.shutdownTimeout;
    
    log.info('Waiting for in-flight requests', {
      component: 'shutdown',
      inFlightRequests: this.inFlightRequests,
      timeoutMs: timeout
    });
    
    while (this.inFlightRequests > 0 && Date.now() - startTime < timeout) {
      await this.sleep(100);
    }
    
    const duration = Date.now() - startTime;
    
    if (this.inFlightRequests > 0) {
      log.warn('Timeout waiting for in-flight requests', {
        component: 'shutdown',
        remainingRequests: this.inFlightRequests,
        durationMs: duration
      });
    } else {
      log.info('All in-flight requests completed', {
        component: 'shutdown',
        durationMs: duration
      });
    }
  }
  
  /**
   * Persist critical state to disk
   */
  async persistState() {
    log.info('Persisting critical state', {
      component: 'shutdown',
      stateFile: this.stateFile
    });
    
    try {
      const state = {
        timestamp: Date.now(),
        shutdownReason: 'graceful',
        blockedIPs: this.components.rateLimiter ? 
          this.components.rateLimiter.getBlockedIPs() : [],
        confirmedBots: this.components.contagionGraph ? 
          [...this.components.contagionGraph.confirmedBots] : [],
        blockchain: this.components.threatLedger ? 
          this.components.threatLedger.exportChain() : [],
        stats: {
          totalRequests: this.components.liveStats?.totalRequests || 0,
          blockedRequests: this.components.liveStats?.blockedRequests || 0,
          uptime: process.uptime()
        }
      };
      
      fs.writeFileSync(this.stateFile, JSON.stringify(state, null, 2));
      
      log.info('State persisted successfully', {
        component: 'shutdown',
        stateFile: this.stateFile,
        blockedIPCount: state.blockedIPs.length,
        confirmedBotCount: state.confirmedBots.length,
        blockchainLength: state.blockchain.length
      });
      
    } catch (error) {
      log.error('Error persisting state', {
        component: 'shutdown',
        error: error.message,
        stack: error.stack
      });
    }
  }
  
  /**
   * Close all resources
   */
  async closeResources() {
    log.info('Closing resources', { component: 'shutdown' });
    
    // Close any open file handles, database connections, etc.
    // Currently SENTINEL is in-memory only, so nothing to close
    
    log.info('Resources closed', { component: 'shutdown' });
  }
  
  /**
   * Restore state from previous shutdown
   */
  restoreState() {
    if (!fs.existsSync(this.stateFile)) {
      log.info('No previous state to restore', {
        component: 'shutdown',
        stateFile: this.stateFile
      });
      return null;
    }
    
    try {
      const stateData = fs.readFileSync(this.stateFile, 'utf8');
      const state = JSON.parse(stateData);
      
      log.info('Previous state restored', {
        component: 'shutdown',
        stateFile: this.stateFile,
        timestamp: state.timestamp,
        blockedIPCount: state.blockedIPs?.length || 0,
        confirmedBotCount: state.confirmedBots?.length || 0
      });
      
      return state;
      
    } catch (error) {
      log.error('Error restoring state', {
        component: 'shutdown',
        error: error.message,
        stack: error.stack
      });
      return null;
    }
  }
  
  /**
   * Sleep helper
   */
  sleep(ms) {
    return new Promise(resolve => setTimeout(resolve, ms));
  }
}

module.exports = GracefulShutdownManager;
