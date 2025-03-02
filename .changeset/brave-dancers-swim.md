---
'web-fragments': patch
---

fix(gateway): Node middleware adapter handles resp.end() correctly

The Node middleware adapter now correctly handles the cases where the response
is flushed with resp.end() without prior calls to resp.writeHead().

This bug was impacting Vite which uses the following pattern:

```js
res.statusCode = 200;
res.end(content);
```
