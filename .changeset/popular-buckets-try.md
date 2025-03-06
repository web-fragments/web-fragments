---
'web-fragments': patch
---

feat: add support for unbound fragments

Unbound fragments are fragments that don't have their location, history, navigation, and routing bound to the shell application.

This means that unbound fragments have independent history and navigation that is not represented in browsers address bar, and is not navigable via back and forward buttons/gestures.

This kind of fragments are useful for auxiliary UI fragments that might have a complex inner state and routing but this state is ephemeral and doesn't need to be preserved during hard reloads.

Good examples of these use-cases are chat bots, various side panels, assistants, etc.
