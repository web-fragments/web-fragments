---
title: "Broadcasting events and communicating state"
layout: "~/layouts/MarkdownLayout.astro"
---

_Last updated_: April 12, 2025

Web Fragments, encapsulated in `custom elements` with `shadowRoot`, are part of the same [Document Object Model (DOM)](https://developer.mozilla.org/en-US/docs/Glossary/DOM). This allows them to leverage [Web Platform APIs](https://developer.mozilla.org/en-US/docs/Web/API), making them lightweight and encouraging the use of standard Web APIs instead of custom library APIs.

> Efforts are underway to collaborate with standards bodies to integrate parts of Web Fragments into the Web Platform as official standards.

## Using the `Broadcast Channel API` for Fragment Communication

Fragments can share data and communicate using the [Broadcast Channel API](https://developer.mozilla.org/en-US/docs/Web/API/Broadcast_Channel_API). This API enables fragments to post messages and share state efficiently.

### Example: Broadcasting Between Fragments

Consider a scenario with a catalog or product list as one fragment and a shopping cart as another. When a user adds items to the cart via a button in the product list, the cart fragment receives a message from the catalog fragment.

#### Fragment A: Broadcasting a Message

```javascript
// Fragment A - Post (broadcast) message
const bc = new BroadcastChannel("/cart");
bc.postMessage({ type: "cart_cleared" });
bc.close();
```

#### Fragment B: Listening and Processing Messages

```javascript
// Fragment B - Listen and process message
const handleMessage = (event: MessageEvent) => {
  const { type, product } = event.data;
  if (type === 'add_to_cart') {
    addItem(product);
  }
};

const bc = new BroadcastChannel("/cart");
bc.addEventListener('message', handleMessage);

return () => {
  bc.removeEventListener('message', handleMessage);
};
```

![Web Fragments Middleware](../../assets/images/wf-broadcastchannel.drawio.png)

> **Note**: All [fragments](./glossary#fragment) must share the same origin to ensure seamless communication.

---

#### Authors

<ul class="authors">
    <li class="author"><a href="https://github.com/anfibiacreativa">anfibiacreativa</a></li>
    <li class="author"><a href="https://github.com/igorminar">IgorMinar</a></li>
</ul>
