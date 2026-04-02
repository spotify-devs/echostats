import { test, expect } from "@playwright/test";

test.describe("API Contract", () => {
  const API_BASE = process.env.BASE_URL || "http://localhost:8000";

  test("OpenAPI schema is valid JSON", async ({ request }) => {
    const response = await request.get(`${API_BASE}/api/openapi.json`);
    expect(response.status()).toBe(200);
    const schema = await response.json();
    expect(schema.openapi).toBeTruthy();
    expect(schema.paths).toBeTruthy();
    expect(schema.info.title).toBe("EchoStats API");
  });

  test("analytics overview endpoint has expected fields", async ({ request }) => {
    const response = await request.get(`${API_BASE}/api/openapi.json`);
    const schema = await response.json();
    const overviewPath = schema.paths["/api/v1/analytics/overview"];
    expect(overviewPath).toBeTruthy();
    expect(overviewPath.get).toBeTruthy();
  });

  test("health endpoint matches expected schema", async ({ request }) => {
    const response = await request.get(`${API_BASE}/api/health`);
    const body = await response.json();
    expect(body).toHaveProperty("status");
    expect(body).toHaveProperty("service");
    expect(body).toHaveProperty("version");
  });
});
