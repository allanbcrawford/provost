import { check, sleep } from "k6";
import http from "k6/http";
import { Trend } from "k6/metrics";

// Custom metric for graph page load time
const graphLoadTime = new Trend("graph_load_time", true);

export const options = {
  scenarios: {
    graph_load: {
      executor: "constant-vus",
      vus: 50,
      duration: "2m",
    },
  },
  thresholds: {
    // p95 < 1.5s for /family graph load
    graph_load_time: ["p(95)<1500"],
    http_req_failed: ["rate<0.05"],
    http_req_duration: ["p(95)<1500"],
  },
};

const BASE_URL = __ENV.BASE_URL || "https://staging.provost.app";
const API_TOKEN = __ENV.API_TOKEN || "";

export default function () {
  const headers = {
    Authorization: `Bearer ${API_TOKEN}`,
    Accept: "text/html,application/xhtml+xml",
  };

  const startTime = Date.now();

  const res = http.get(`${BASE_URL}/family`, {
    headers,
    timeout: "5s",
  });

  const loadTime = Date.now() - startTime;
  graphLoadTime.add(loadTime);

  check(res, {
    "status is 200": (r) => r.status === 200,
    "page renders graph content": (r) =>
      r.body && (r.body.includes("family") || r.body.includes("graph")),
  });

  // Also hit the graph data API endpoint
  const apiStart = Date.now();
  const apiRes = http.get(`${BASE_URL}/api/family/graph`, {
    headers: {
      ...headers,
      Accept: "application/json",
    },
    timeout: "5s",
  });

  check(apiRes, {
    "graph API status 200 or 401": (r) => r.status === 200 || r.status === 401,
  });

  sleep(Math.random() * 2 + 1); // 1–3s between requests
}
