import { test, expect } from ".";

test.describe("History API behavior", () => {
	test("a reframed context ignores the broadcasted `popstate` event from the main window if it originated from a client-side navigation from that same context", async ({
		page,
	}) => {
		await page.setContent(`
        <!DOCTYPE html>
        <html>
          <head>
            <script>
              window.popstateCount = 0;
              window.addEventListener('popstate', () => window.popstateCount++);
            </script>
          </head>
          <body>
            <div id="frame1">
              <script type="inert">
                window.popstateCount = 0;
                window.addEventListener('popstate', () => window.popstateCount++);

                // perform a client-side navigation just in this context
                window.setTimeout(
                  () => history.pushState(null, "", "/foo"),
                  10
                );
              </script>
            </div>
            <div id="frame2">
              <script type="inert">
                window.popstateCount = 0;
                window.addEventListener('popstate', () => window.popstateCount++);
              </script>
            </div>
            <script>
              Reframed.reframed(frame1);
              Reframed.reframed(frame2);
            </script>
          </body>
        </html>`);

		await page.waitForFunction("window.popstateCount > 0");

		const reframedContext1 = page.frames()[1];
		const reframedContext2 = page.frames()[2];

		// ensure a popstate event was dispatched in the contexts that didn't initiate the client-side navigation
		expect(await page.evaluate("window.popstateCount")).toBe(1);
		expect(await reframedContext1.evaluate("window.popstateCount")).toBe(0);
		expect(await reframedContext2.evaluate("window.popstateCount")).toBe(1);

		// ensure the navigation was correctly reflected across all execution contexts
		expect(await page.evaluate("window.location.pathname")).toBe("/foo");
		expect(await reframedContext1.evaluate("window.location.pathname")).toBe(
			"/foo"
		);
		expect(await reframedContext2.evaluate("window.location.pathname")).toBe(
			"/foo"
		);
	});
});
