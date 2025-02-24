import http from 'k6/http';
import { check, sleep, group } from 'k6';
import { Rate, Trend } from 'k6/metrics';
import { randomString } from 'https://jslib.k6.io/k6-utils/1.2.0/index.js';

// Custom metrics
const errorRate = new Rate('errors');
const questionsFetchTrend = new Trend('questions_fetch_duration');
const scanResultsTrend = new Trend('scan_results_duration');
const leaderboardTrend = new Trend('leaderboard_fetch_duration');

// Test configuration
export const options = {
  stages: [
    { duration: '1m', target: 50 },   // Ramp up to 50 users over 1 minute
    { duration: '3m', target: 50 },   // Stay at 50 users for 3 minutes
    { duration: '1m', target: 100 },  // Ramp up to 100 users over 1 minute
    { duration: '3m', target: 100 },  // Stay at 100 users for 3 minutes
    { duration: '1m', target: 0 },    // Ramp down to 0 users over 1 minute
  ],
  thresholds: {
    http_req_duration: ['p(95)<500'], // 95% of requests should be below 500ms
    'errors': ['rate<0.1'],           // Error rate should be below 10%
    'questions_fetch_duration': ['p(95)<300'],
    'scan_results_duration': ['p(95)<400'],
    'leaderboard_fetch_duration': ['p(95)<400'],
  },
};

// Helper function to generate random scan result
function generateScanResult() {
  const name = `Tester_${randomString(8)}`;
  const score = Math.floor(Math.random() * 100);
  return {
    name: name,
    verdict: score >= 50 ? 'NICE' : 'NAUGHTY',
    message: `Test result for ${name}`,
    score: score,
    country: 'DE'
  };
}

export default function () {
  const baseUrl = 'http://localhost:3000';

  group('Health Check', function () {
    const healthRes = http.get(`${baseUrl}/health`);
    check(healthRes, {
      'health check status is 200': (r) => r.status === 200,
      'health check response is healthy': (r) => r.json().status === 'healthy',
    }) || errorRate.add(1);
  });

  group('Fetch Questions', function () {
    const questionsStartTime = new Date();
    const questionsRes = http.get(`${baseUrl}/api/questions`);
    questionsFetchTrend.add(new Date() - questionsStartTime);

    check(questionsRes, {
      'questions status is 200': (r) => r.status === 200,
      'questions response is array': (r) => Array.isArray(r.json()),
      'questions contain required fields': (r) => {
        const questions = r.json();
        return questions.every(q => 
          q.id && 
          q.text && 
          Array.isArray(q.options) &&
          q.options.every(o => o.text && typeof o.naughtyPoints === 'number')
        );
      },
    }) || errorRate.add(1);
  });

  group('Submit Scan Results', function () {
    const payload = generateScanResult();
    const scanStartTime = new Date();
    const scanRes = http.post(
      `${baseUrl}/api/scan-results`,
      JSON.stringify(payload),
      { headers: { 'Content-Type': 'application/json' } }
    );
    scanResultsTrend.add(new Date() - scanStartTime);

    check(scanRes, {
      'scan result status is 201': (r) => r.status === 201,
      'scan result is saved correctly': (r) => {
        const result = r.json();
        return (
          result.name === payload.name &&
          result.verdict === payload.verdict &&
          result.score === payload.score
        );
      },
    }) || errorRate.add(1);
  });

  group('Fetch Leaderboard', function () {
    const leaderboardStartTime = new Date();
    const leaderboardRes = http.get(`${baseUrl}/api/leaderboard`);
    leaderboardTrend.add(new Date() - leaderboardStartTime);

    check(leaderboardRes, {
      'leaderboard status is 200': (r) => r.status === 200,
      'leaderboard is array': (r) => Array.isArray(r.json()),
      'leaderboard entries have required fields': (r) => {
        const entries = r.json();
        return entries.every(e => 
          e.name && 
          e.score !== undefined && 
          e.verdict &&
          ['NAUGHTY', 'NICE'].includes(e.verdict)
        );
      },
    }) || errorRate.add(1);
  });

  // Random sleep between requests to simulate real user behavior
  sleep(Math.random() * 3 + 1); // Sleep between 1-4 seconds
}