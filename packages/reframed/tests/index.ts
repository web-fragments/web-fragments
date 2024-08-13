import { test as setup } from "@playwright/test";
import { build } from "vite";
import viteConfig from "../vite.config";

export * from "@playwright/test";

export const test = setup.extend({
	page: async ({ page }, use) => {
		await page.route("/", async (route) => route.fulfill());
		await page.goto("/");
		await page.addScriptTag({
			path: new URL(import.meta.resolve("../dist/reframed.umd")).pathname,
		});
		await use(page);
	},
});

export default async function globalSetup() {
	Object.assign(viteConfig.build!.lib!, {
		name: "Reframed",
		formats: ["umd"],
	});

	await build(viteConfig);
}
