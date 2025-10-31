# ✨ JavaScript Call Flow Tracing Proxy — JSCFTP 🕵

JSCFTP is a proxy server that instruments client-side JavaScript and generates a function call flow trace.

Function call flow trace is useful when debugging applications and understanding the flow of execution.

Unlike existing tracing tools, JSCFTP is focused on transparent instrumentation of client-side JavaScript and does not require any changes to the application code. Even production code delivered to the browser over HTTPS and protected with CSP can be traced without any changes due to the browser proxy design.
