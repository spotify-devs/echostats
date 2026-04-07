import http from "k6/http";
import { check, sleep } from "k6";

export const options = {
  stages: [
    { duration: "30s", target: 20 },   // Ramp up to 20 users
    { duration: "1m", target: 50 },    // Ramp to 50
    { duration: "1m", target: 100 },   // Ramp to 100
    { duration: "30s", target: 0 },    // Ramp down
  ],
  thresholds: {
    http_req_duration: ["p(95)<2000"],  // 95% of requests under 2s
    http_req_failed: ["rate<0.05"],     // Less than 5% errors
  },
};

const BASE_URL = __ENV.BASE_URL || "http://localhost:8000";

export default function () {
  // Health check (no auth needed)
  const healthRes = http.get(`${BASE_URL}/api/health`);
  check(healthRes, {
    "health status 200": (r) => r.status === 200,
    "health is healthy": (r) => JSON.parse(r.body).status === "healthy",
  });

  // Readiness check
  const readyRes = http.get(`${BASE_URL}/api/health/ready`);
  check(readyRes, {
    "ready status 200": (r) => r.status === 200,
  });

  // API docs (static, good for load baseline)
  const docsRes = http.get(`${BASE_URL}/api/openapi.json`);
  check(docsRes, {
    "openapi status 200": (r) => r.status === 200,
  });

  sleep(1);
}
