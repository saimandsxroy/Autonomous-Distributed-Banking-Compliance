import http from 'k6/http';
import { check, sleep } from 'k6';

export const options = {
  stages: [
    { duration: '30s', target: 50 },
    { duration: '1m', target: 200 },
    { duration: '30s', target: 0 },
  ],
  thresholds: {
    http_req_duration: ['p(99)<250'],
    http_req_failed: ['rate<0.01'],
  },
};

export default function () {
  const payload = JSON.stringify({
    sourceAccountId: 1,
    destinationAccountId: 2,
    amount: 10.00,
    currency: 'USD',
    title: 'k6 Automated Throughput Invariant Test'
  });
  const params = {
    headers: {
      'Content-Type': 'application/json',
      'Idempotency-Key': 'k6-' + Math.random().toString(36).substring(2, 10),
      'Authorization': 'Basic YWxpY2U6cGFzc3dvcmQxMjM='
    },
  };
  const res = http.post('http://localhost:8081/journal/transfer', payload, params);
  check(res, {
    'status is 200 or 201': (r) => r.status === 200 || r.status === 201,
  });
  sleep(0.1);
}
