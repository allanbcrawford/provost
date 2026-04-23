import { check, sleep } from "k6";
import http from "k6/http";
import { Trend } from "k6/metrics";

// Custom metrics
const timeToFirstToken = new Trend("time_to_first_token", true);
const timeToCompletion = new Trend("time_to_completion", true);

export const options = {
  scenarios: {
    chat_load: {
      executor: "constant-vus",
      vus: 20,
      duration: "2m",
    },
  },
  thresholds: {
    // p95 < 3s to first token
    time_to_first_token: ["p(95)<3000"],
    // p99 < 10s to completion
    time_to_completion: ["p(99)<10000"],
    http_req_failed: ["rate<0.05"],
  },
};

const BASE_URL = __ENV.BASE_URL || "https://staging.provost.app";
const API_TOKEN = __ENV.API_TOKEN || "";

const MESSAGES = [
  "What are the inheritance tax implications for a $5M estate?",
  "Simulate an ILIT trust structure for wealth transfer",
  "Show me the waterfall distribution for a generation-skipping trust",
  "What is the optimal asset allocation for a family with $10M in assets?",
  "Explain the benefits of a charitable remainder trust",
];

export default function () {
  const headers = {
    "Content-Type": "application/json",
    Authorization: `Bearer ${API_TOKEN}`,
  };

  for (let i = 0; i < 5; i++) {
    const message = MESSAGES[i % MESSAGES.length];
    const startTime = Date.now();

    const res = http.post(
      `${BASE_URL}/api/chat`,
      JSON.stringify({
        message,
        stream: true,
      }),
      { headers, timeout: "15s" },
    );

    const firstTokenTime = Date.now() - startTime;
    timeToFirstToken.add(firstTokenTime);

    check(res, {
      "status is 200": (r) => r.status === 200,
      "response has content": (r) => r.body && r.body.length > 0,
    });

    const completionTime = Date.now() - startTime;
    timeToCompletion.add(completionTime);

    sleep(Math.random() * 3 + 2); // 2–5s between messages
  }
}
