# Broadcast Channel API abstraction

This is an abstraction of the [Broadcast Channel API](https://developer.mozilla.org/en-US/docs/Web/API/Broadcast_Channel_API), part of the Web Platform.

## Usage

Consider a Fragment A, that is an emitter of state

```javascript
// Fragment A (emitter)
const emitter = createBroadcastChannelAPI < { key: string } > '/fragment-path';
emitter.emitState({ key: 'value' });
```

and a Fragment B, that is a consumer of state and must respond to changes

```javascript
// Fragment B (listener)
const listener = createBroadcastChannelAPI < { key: string } > '/fragment-path';
listener.onUpdate((state) => {
	console.log('Received state:', state);
});
// this notigfies the emitter to send the current state for
// this newly registered fragment
listener.notifyNewFragment();
```

For more info go to
[Web Fragments Documentation | Broadcast Channel ](https://webfragments.dev/documentation/broadcasting-state/)
