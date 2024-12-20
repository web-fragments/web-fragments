/**
 * Represents a message sent through the BroadcastChannel.
 * @template T - The type of the state object.
 */
type Message<T> = {
	type: "state-update";
	state: T;
	newFragment: boolean;
};

/**
 * Creates a BroadcastChannel API for managing state updates across fragments.
 * @template T - The type of the state object.
 * @param {string} channelName - The name of the BroadcastChannel.
 * @returns {Object} - Methods to interact with the BroadcastChannel API.
 *   - emitState: Emit a new state update.
 *   - onUpdate: Register a callback for state updates.
 *   - notifyNewFragment: Notify the emitter about a new fragment.
 *   - close: Close the BroadcastChannel.
 */
export const createFragmentsChannel = <T>(channelName: string) => {
	const channel = new BroadcastChannel(channelName);
	let currentState: T | undefined;
	let onUpdateCallback: ((state: T) => void) | undefined;

	/**
	 * Handles incoming messages on the BroadcastChannel.
	 * @param {MessageEvent<Message<T>>} event - The message event containing the state update.
	 */
	const handleMessage = (event: MessageEvent<Message<T>>) => {
		const { type, state, newFragment } = event.data;

		if (type === "state-update" && !newFragment) {
			currentState = state;
			onUpdateCallback?.(state);
		}
	};

	channel.onmessage = handleMessage;

	/**
	 * Emits a new state update to all listeners.
	 * @param {T} state - The new state to emit.
	 */
	const emitState = (state: T): void => {
		currentState = state;
		channel.postMessage({
			type: "state-update",
			state,
			newFragment: false,
		});
	};

	/**
	 * Registers a callback to listen for state updates.
	 * @param {(state: T) => void} callback - The callback to execute on state updates.
	 */
	const onUpdate = (callback: (state: T) => void): void => {
		onUpdateCallback = callback;
	};

	// let the emitter know there is a new fragment
	// so it rebroadcasts current state
	const notifyNewFragment = (): void => {
		if (currentState !== undefined) {
			channel.postMessage({
				type: "state-update",
				state: currentState,
				newFragment: true,
			});
		}
	};

	const close = (): void => {
		channel.close();
	};

	return { emitState, onUpdate, notifyNewFragment, close };
};
