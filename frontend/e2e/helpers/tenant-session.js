export async function mockTenantExperience(page) {
  await page.route("**/api/ui-experience", (route) => route.fulfill({
    status: 200,
    contentType: "application/json",
    body: JSON.stringify({ success: true, data: {
      copy: {}, theme: { preset: "mint", radius: "standard", depth: "clay" }, config_version: 0,
    } }),
  }));
}
