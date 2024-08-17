import { test, expect } from ".";

test.describe("Reframing already-rendered content", () => {
	test("reframed scripts execute in an isolated context", async ({ page }) => {
		await page.setContent(`
      <!DOCTYPE html>
      <html>
        <head>
          <script>
            window.context = "main"
          </script>
        </head>
        <body>
          <div id="target">
            <script type="inert">
              window.context = "reframed"
            </script>
          </div>
          <script>
            Reframed.reframed(target)
          </script>
        </body>
      </html>`);

		const reframedContext = page.frames()[1];

		expect(await page.evaluate("window.context")).toBe("main");
		expect(await reframedContext.evaluate("window.context")).toBe("reframed");
	});
});

test.describe("Fetch-and-reframe content", () => {
	test("reframed scripts execute in an isolated context", async ({ page }) => {
		page.route("**/content", async (route) => {
			route.fulfill({
				contentType: "text/html",
				body: `
          <div id="target">
            <script>
              window.context = "reframed"
            </script>
          </div>`,
			});
		});

		await page.setContent(`
      <!DOCTYPE html>
      <html>
        <head>
          <script>
            window.context = "main"
          </script>
        </head>
        <body>
          <script>
            Reframed.reframed("/content")
          </script>
        </body>
      </html>`);

		const reframedContext = page.frames()[1];

		// FIXME: reframed currently first loads an iframe at about:blank, then sets the src.
		// We should refactor things so that we just load the correct src initially.
		// Once we do this, we can remove this waitForUrl()
		await reframedContext.waitForURL("**/content");

		expect(await page.evaluate("window.context")).toBe("main");
		expect(await reframedContext.evaluate("window.context")).toBe("reframed");
	});
});

test("reframed scripts render content into the specified container", async ({
	page,
}) => {
	await page.setContent(`
    <!DOCTYPE html>
    <html>
      <body>
        <div id="target">
          <template shadowrootmode="open">
            <div data-testid="container"></div>
            <script type="inert">
              const text = document.createElement('span')
              text.innerText = "Hello world"
              document.body.appendChild(text)
            </script>
          </template>
        </div>
        <script>
          Reframed.reframed(target.shadowRoot, { container: target })
        </script>
      </body>
    </html>
	`);

	await expect(page.getByText("Hello world")).toBeVisible();
	await expect(page.getByTestId("container")).toHaveText("Hello world");
});

test("iframe window size properties delegate to the main frame", async ({
	page,
}) => {
	await page.setContent(`
    <!DOCTYPE html>
    <html>
      <head>
        <script>
          window.context = "main"
        </script>
      </head>
      <body>
        <div id="target">
          <script type="inert">
            window.context = "reframed"
          </script>
        </div>
        <script>
          Reframed.reframed(target)
        </script>
      </body>
    </html>`);

	const reframedContext = page.frames()[1];

	const sizeProperties = [
		"innerWidth",
		"innerHeight",
		"outerWidth",
		"outerHeight",
	];
	for (const property of sizeProperties) {
		const mainFrameValue = await page.evaluate(`window.${property}`);
		const iframeValue = await reframedContext.evaluate(`window.${property}`);
		expect(iframeValue).toBe(mainFrameValue);
		expect(iframeValue).toBeGreaterThan(0);
	}
});
