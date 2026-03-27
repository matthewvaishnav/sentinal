/**
 * Event Bus
 *
 * Central pub/sub hub for SENTINEL events.
 * Broadcasts real-time events to all connected WebSocket dashboard clients.
 */

const log = require('./logger');

class EventBus {
  constructor() {
    this.clients = new Set();
    this.recentEvents = []; // Ring buffer, last 200 events
    this.MAX_EVENTS = 200;
    this.pendingEvents = [];
    this.lastBroadcast = 0;
    this.BATCH_INTERVAL = 100; // ms - batch events for efficiency
  }

  addWSClient(ws) {
    this.clients.add(ws);
    ws.on('close', () => this.clients.delete(ws));
    ws.on('error', () => this.clients.delete(ws));
  }

  _broadcast(payload) {
    const msg = JSON.stringify(payload);
    for (const ws of this.clients) {
      try {
        if (ws.readyState === 1 /* OPEN */) ws.send(msg);
      } catch (_) {
        this.clients.delete(ws);
      }
    }
  }

  _queueEvent(event) {
    this.pendingEvents.push(event);
    
    const now = Date.now();
    if (now - this.lastBroadcast >= this.BATCH_INTERVAL) {
      this._flushBatch();
    }
  }

  _flushBatch() {
    if (this.pendingEvents.length === 0) return;
    
    // If only one event, send it directly
    if (this.pendingEvents.length === 1) {
      this._broadcast(this.pendingEvents[0]);
    } else {
      // Send as batch
      const batch = {
        type: 'batch',
        events: this.pendingEvents,
        ts: Date.now()
      };
      this._broadcast(batch);
    }
    
    this.pendingEvents = [];
    this.lastBroadcast = Date.now();
  }

  _record(event) {
    this.recentEvents.push(event);
    if (this.recentEvents.length > this.MAX_EVENTS) {
      this.recentEvents.shift();
    }
  }

  logEvent(level, message) {
    const event = { type: 'log', level, message, ts: Date.now() };
    this._record(event);
    this._queueEvent(event);
  }

  blockEvent(ip, reason, durationSecs) {
    const event = { type: 'block', ip, reason, durationSecs, ts: Date.now() };
    this._record(event);
    this._queueEvent(event);
    log.block(ip, reason, durationSecs * 1000);
  }

  honeypotHit(ip, path) {
    const event = { type: 'honeypot', ip, path, ts: Date.now() };
    this._record(event);
    this._queueEvent(event);
    log.honeypot(ip, path);
  }

  threatAlert(ip, reason, severity = 'medium') {
    const event = { type: 'threat', ip, reason, severity, ts: Date.now() };
    this._record(event);
    this._queueEvent(event);
    log.threat(ip, severity, reason);
  }

  challengeIssued(ip) {
    const event = { type: 'challenge_issued', ip, ts: Date.now() };
    this._record(event);
    this._queueEvent(event);
  }

  challengeSolved(ip, solveTimeMs) {
    const event = { type: 'challenge_solved', ip, solveTimeMs, ts: Date.now() };
    this._record(event);
    this._queueEvent(event);
  }

  statsUpdate(stats) {
    this._queueEvent({ type: 'stats', ...stats, ts: Date.now() });
  }

  // Force flush any pending events (called on shutdown)
  flush() {
    this._flushBatch();
  }

  getRecentEvents(limit = 50) {
    return this.recentEvents.slice(-limit);
  }
}

// Singleton — one bus for the whole process
module.exports = new EventBus();
