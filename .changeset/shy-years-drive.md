---
'web-fragments': patch
---

fix(gateway): close tag in reframed init HTML response

We've observed that some middlewares append strings to the reframed init html. Simple append results in the new string becoming part of the title which is causes problems for reframed library as well as the injected code/html as that's not how it was intended to be used.

By closing the title tag, even though not needed by the browser, the html becomes more resilient.
