import { test, expect, type Frame } from '.';

const RESPONSE_WITH_VALID_FRAGMENT_HTML = `
<!DOCTYPE html>
<html>
  <head>
    <script>
      window.context = "main"
    </script>
  </head>
  <body>
    <div id="target">
    <template shadowrootmode="open">
      <wf-html id="wf-html-id">
        <wf-head id="wf-head-id"></wf-head>
        <wf-body id="wf-body-id">
          <script type="inert">
            window.context = "reframed"
          </script>
        </wf-body>
      </wf-html>
    </template>
    </div>
    <script>
      Reframed.reframed(target.shadowRoot, { container: target})
    </script>
  </body>
</html>`;

test.describe('Patching special elements in reframed context', () => {
	test('document references to documentElement|head|body should point to custom elements', async ({ page }) => {
		await page.setContent(RESPONSE_WITH_VALID_FRAGMENT_HTML);
		const reframedContext = page.frames()[1];

		expect(await reframedContext.evaluate('document.documentElement.getAttribute("id")')).toBe('wf-html-id');
		expect(await reframedContext.evaluate('document.head.getAttribute("id")')).toBe('wf-head-id');
		expect(await reframedContext.evaluate('document.body.getAttribute("id")')).toBe('wf-body-id');
	});

	test('querySelector should be patched for simple tag name selectors', async ({ page }) => {
		await page.setContent(RESPONSE_WITH_VALID_FRAGMENT_HTML);
		const reframedContext = page.frames()[1];

		// helper function for evaluating queries
		const query = async (queryString: string) =>
			reframedContext.evaluate(`document.querySelector("${queryString}").getAttribute('id')`);

		// assert query for documentElement
		const documentElementId = await reframedContext.evaluate('document.documentElement.getAttribute("id")');
		expect(await query('html')).toBe(documentElementId);
		expect(await query('HTML')).toBe(documentElementId);
		expect(await query('wf-html')).toBe(documentElementId);
		expect(await query('WF-HTML')).toBe(documentElementId);

		// assert query for head
		const documentHeadId = await reframedContext.evaluate('document.head.getAttribute("id")');
		expect(await query('head')).toBe(documentHeadId);
		expect(await query('HEAD')).toBe(documentHeadId);
		expect(await query('wf-head')).toBe(documentHeadId);
		expect(await query('WF-HEAD')).toBe(documentHeadId);

		// assert query for body
		const documentBodyId = await reframedContext.evaluate('document.body.getAttribute("id")');
		expect(await query('body')).toBe(documentBodyId);
		expect(await query('BODY')).toBe(documentBodyId);
		expect(await query('wf-body')).toBe(documentBodyId);
		expect(await query('WF-BODY')).toBe(documentBodyId);
	});

	test('getElementsByTagName should be patched for simple tag name selectors', async ({ page }) => {
		await page.setContent(RESPONSE_WITH_VALID_FRAGMENT_HTML);
		const reframedContext = page.frames()[1];

		// helper function for evaluating queries
		const getByTagName = async (queryString: string) =>
			reframedContext.evaluate(
				`document.getElementsByTagName("${queryString}")[0]?.getAttribute("id")`,
			) as unknown as HTMLCollection;

		// assert query for documentElement
		const documentElementId = await reframedContext.evaluate('document.documentElement.getAttribute("id")');
		expect(await getByTagName('html')).toEqual(documentElementId);
		expect(await getByTagName('HTML')).toEqual(documentElementId);
		expect(await getByTagName('html')).toEqual(documentElementId);
		expect(await getByTagName('WF-HTML')).toEqual(documentElementId);

		// assert query for head
		const documentHeadId = await reframedContext.evaluate('document.head.getAttribute("id")');
		expect(await getByTagName('head')).toEqual(documentHeadId);
		expect(await getByTagName('HEAD')).toEqual(documentHeadId);
		expect(await getByTagName('wf-head')).toEqual(documentHeadId);
		expect(await getByTagName('WF-HEAD')).toEqual(documentHeadId);

		// assert query for body
		const bodyId = await reframedContext.evaluate('document.body.getAttribute("id")');
		expect(await getByTagName('body')).toEqual(bodyId);
		expect(await getByTagName('BODY')).toEqual(bodyId);
		expect(await getByTagName('wf-body')).toEqual(bodyId);
		expect(await getByTagName('WF-BODY')).toEqual(bodyId);
	});

	test('tagName should be patched for custom elements', async ({ page }) => {
		await page.setContent(RESPONSE_WITH_VALID_FRAGMENT_HTML);
		const reframedContext = page.frames()[1];

		expect(await reframedContext.evaluate('document.documentElement.tagName')).toBe('HTML');
		expect(await reframedContext.evaluate('document.head.tagName')).toBe('HEAD');
		expect(await reframedContext.evaluate('document.body.tagName')).toBe('BODY');
	});
});
