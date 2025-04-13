---
title: "Web Fragments Troubleshooting"
layout: "~/layouts/MarkdownLayout.astro"
---

_Last updated_: April 12, 2025

## Common errors

| Error domain       | Probable cause                                                                    | Link                                                                                  |
| ------------------ | --------------------------------------------------------------------------------- | ------------------------------------------------------------------------------------- |
| elements errors    | Custom elements are not registered or not registered on time                      | <a href="./elements">Elements registration</a>                                        |
| fragment errors    | Fragment not found. Server is down or fragment registration misconfig.            | <a href="./gateway#pre-requirements-and-conventions">Requirements and conventions</a> |
| JavaScript context | Scripts from a fragment interfere with the main application or other fragments    | <a href="./reframed">Reframing Documentation</a>                                      |
| Browser history    | Navigation within a fragment does not update the browser's address bar or history | <a href="./location-and-history">Shared Location API and History API</a>              |

---

## Additional Troubleshooting Tips

### Custom Elements Not Working

**Symptom**: Custom elements are not rendering or behaving as expected.

**Probable Cause**: The `initializeWebFragments()` function was not called early enough during the application bootstrap.

**Solution**:

- Ensure that `initializeWebFragments()` is invoked as early as possible in the client-side code.
- Refer to the [Elements Registration Documentation](./elements) for detailed steps.

### Fragment Gateway Misconfiguration

**Symptom**: Fragment requests are not routed correctly, or assets are not loading.

**Probable Cause**: The `routePatterns` in the fragment gateway configuration are incorrect or incomplete.

**Solution**:

- Verify that the `routePatterns` match the expected URL structure of the fragment.
- Check the [Gateway Requirements and Conventions](./gateway#pre-requirements-and-conventions) for proper configuration.

### Browser History Issues

**Symptom**: Navigation within a fragment does not update the browser's address bar or history.

**Probable Cause**: The fragment is not bound to the browser's `window.location` and `history`.

**Solution**:

- Ensure the fragment is registered as a bound fragment.
- For more details, see the [Shared Location API and History API Documentation](./location-and-history).

### JavaScript Context Isolation Problems

**Symptom**: Scripts from a fragment interfere with the main application or other fragments.

**Probable Cause**: The fragment's JavaScript context is not properly isolated.

**Solution**:

- Verify that the fragment is running in a dedicated context using Web Fragments' reframing technique.
- Learn more about reframing in the [Reframing Documentation](./reframed).

### Debugging Tips

- Use browser developer tools to inspect the DOM and network requests.
- Check the console for JavaScript errors or warnings.
- For issues related to the History API, refer to the [Mozilla Developer Docs on the History API](https://developer.mozilla.org/en-US/docs/Web/API/History_API).

---

#### Authors

<ul class="authors">
	<li class="author">
		<a href="https://github.com/anfibiacreativa">anfibiacreativa</a>
	</li>
	<li class="author">
		<a href="https://github.com/igorminar">IgorMinar</a>
	</li>
</ul>
