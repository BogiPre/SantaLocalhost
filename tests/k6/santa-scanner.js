import http from 'k6/http';
import { check, group, sleep } from 'k6';
import { Counter, Rate, Trend } from 'k6/metrics';
import { randomIntBetween } from 'https://jslib.k6.io/k6-utils/1.2.0/index.js';

// Custom metrics
const cacheHitRate = new Rate('cache_hit_rate');
const leaderboardFetchDuration = new Trend('leaderboard_fetch_duration');
const mongoQueryTime = new Trend('mongo_query_time');

export const options = {
  scenarios: {
    read_heavy: {
      executor: 'constant-vus',
      vus: 10,
      duration: '30s',
    },
    write_operations: {
      executor: 'constant-arrival-rate',
      rate: 1,
      timeUnit: '10s',
      duration: '30s',
      preAllocatedVUs: 5,
      maxVUs: 10,
    }
  },
  thresholds: {
    'http_req_duration': ['p(95)<500'],
    'leaderboard_fetch_duration': ['p(95)<400'],
    'cache_hit_rate': ['rate>0.7'],
    'mongo_query_time': ['p(95)<100']
  },
};

const FIRST_NAMES = ['James', 'Mary', 'John', 'Emma'];
const LAST_NAMES = ['Smith', 'Johnson', 'Brown', 'Davis'];
const MESSAGES = [
  'Has been very kind this year',
  'Always helps others',
  'Could improve their behavior'
];

function getRandomElement(array) {
  return array[Math.floor(Math.random() * array.length)];
}

function generateScanResult() {
  const score = Math.floor(Math.random() * 100);
  return {
    name: `${getRandomElement(FIRST_NAMES)} ${getRandomElement(LAST_NAMES)}`,
    verdict: score > 50 ? 'NICE' : 'NAUGHTY',
    message: getRandomElement(MESSAGES),
    score: score,
  };
}

function checkResponseHeaders(res) {
  return {
    'status is 200': (r) => r.status === 200,
    'response time < 200ms': (r) => r.timings.duration < 200,
    'is compressed': (r) => r.headers['content-encoding'] === 'gzip' || r.headers['content-encoding'] === 'br',
    'has cache header': (r) => r.headers['cache-control'] !== undefined && r.headers['cache-control'].includes('max-age'),
  };
}

function processResponse(res) {
  const cacheHeader = res.headers['x-cache'];
  if (cacheHeader) {
    cacheHitRate.add(cacheHeader === 'HIT');
    console.log('Cache header:', cacheHeader);
  }

  const mongoTime = res.headers['x-mongodb-time'];
  if (mongoTime) {
    mongoQueryTime.add(parseInt(mongoTime));
  }
}

export function setup() {
  const baseUrl = 'http://localhost:3000';
  console.log('Creating initial scan results...');
  
  // Create an initial batch of results
  for (let i = 0; i < 60; i++) {
    const scanResult = generateScanResult();
    http.post(`${baseUrl}/api/scan-results`, JSON.stringify(scanResult), {
      headers: { 'Content-Type': 'application/json' }
    });
  }
  sleep(1);
  
  // Warm up global cache
  http.get(`${baseUrl}/api/leaderboard`, {
    headers: {
      'Accept-Encoding': 'gzip, deflate, br',
      'Accept': 'application/json'
    }
  });
  sleep(1);
  
  console.log('Setup complete - cache warmed');
  sleep(2); // Let the system settle
}

export default function () {
  const baseUrl = 'http://localhost:3000';
  
  // Different behavior based on scenario
  if (__ITER.scenario === 'write_operations') {
    const scanResult = generateScanResult();
    http.post(`${baseUrl}/api/scan-results`, JSON.stringify(scanResult), {
      headers: {
        'Content-Type': 'application/json'
      }
    });
    return;
  }
  
  // Read operations - only global leaderboard
  const params = {
    headers: {
      'Accept-Encoding': 'gzip, deflate, br',
      'Accept': 'application/json'
    }
  };
  
  const url = `${baseUrl}/api/leaderboard`;
  
  const leaderboardStart = Date.now();
  const res = http.get(url, params);
  leaderboardFetchDuration.add(Date.now() - leaderboardStart);
  
  processResponse(res);
  check(res, checkResponseHeaders(res));
  
  // Small delay between requests
  sleep(0.5);
}