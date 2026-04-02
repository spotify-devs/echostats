import { test, expect } from "@playwright/test";

test.describe("Dashboard", () => {
  test("shows login page when unauthenticated", async ({ page }) => {
    await page.goto("/");
    // Should show login/connect button
    await expect(page.getByText(/connect.*spotify|log.*in|get.*started/i)).toBeVisible();
  });

  test("health endpoint returns healthy", async ({ request }) => {
    const response = await request.get("/api/health");
    expect(response.status()).toBe(200);
    const body = await response.json();
    expect(body.status).toBe("healthy");
  });

  test("readiness endpoint responds", async ({ request }) => {
    const response = await request.get("/api/health/ready");
    expect(response.status()).toBe(200);
  });

  test("API docs are accessible", async ({ page }) => {
    await page.goto("/api/docs");
    await expect(page).toHaveTitle(/swagger|echostats/i);
  });

  test("unauthenticated API returns 401", async ({ request }) => {
    const response = await request.get("/api/v1/analytics/overview");
    expect(response.status()).toBe(401);
  });
});
