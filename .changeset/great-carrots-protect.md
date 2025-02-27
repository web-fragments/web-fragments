---
'reframed': patch
'web-fragments': patch
---

fix(reframed): correctly execute external scripts (`<script src="...">`)

Previously we accidentally treated them as inline scripts that haven't been fully parsed and appended, which caused double execution of these scripts.

This issue prevented Analog from bootstrapping correctly in reframed context.
