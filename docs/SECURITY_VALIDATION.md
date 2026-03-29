# Security Validation

This section describes security testing performed for SENTINEL.

## Fuzzing

A basic HTTP fuzz harness targets API endpoints with malformed headers and payloads.

```bash
node scripts/fuzz.js
```

## Example fuzz script

```js
const http = require('http');
const targets = ['/','/sentinel/stats','/sentinel/block'];

for (let i = 0; i < 500; i++) {
  const target = targets[i % targets.length];
  const headers = {
    'User-Agent': `fuzz-${Math.random()}`,
    'X-Forwarded-For': `256.256.256.${i}`
  };
  const req = http.request({
    hostname: 'localhost', port: 3000, path: target, method: 'GET', headers
  }, (res) => {
    res.on('data', () => {});
    res.on('end', () => {});
  });
  req.on('error', () => {});
  req.end();
}
```

## Adversarial attacks

- Repeated malformed headers
- High-rate malformed traffic bursts
- Captcha/Challenge bypass attempts

## CI Security check (optional)

Add to GitHub workflow:

```yaml
- name: Fuzz test
  run: node scripts/fuzz.js
```
