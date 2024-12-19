/**
 * Transforms a stream by applying the provided transformerFn on each chunk.
 *
 * @param stream the input stream to be transformed
 * @param transformerFn the function to be applied to each chunk
 * @returns a transformed stream
 */
export function transformStream(stream: ReadableStream<Uint8Array>, transformerFn: (str: string) => string) {
	const { writable, readable } = new TransformStream();
	const writer = writable.getWriter();

	const transform = async () => {
		try {
			const encoder = new TextEncoder();
			const reader = stream.getReader();

			let chunk = await reader.read();
			while (!chunk.done) {
				const decoder = new TextDecoder();
				let chunkStr = decoder.decode(chunk.value);
				chunkStr = transformerFn(chunkStr);
				let transformedChunk = encoder.encode(chunkStr);

				writer.write(transformedChunk);
				chunk = await reader.read();
			}

			reader.releaseLock();
			writer.close();
		} catch (error: any) {
			writer.abort();
		}
	};

	transform();
	return readable;
}

/**
 * A tagged template that produces a ReadableStream of its content.
 * It supports interpolating other ReadableStreams, which allows you
 * to easily wrap streams with text or combine multiple streams, etc.
 *
 * @example
 * const wrappedBody = asReadableStream`<template>${response.body}</template>`;
 * const combinedStream = asReadableStream`${stream1}${stream2}`;
 */
export function asReadableStream(strings: TemplateStringsArray, ...values: Array<string | number | ReadableStream>) {
	return new ReadableStream({
		async start(controller) {
			try {
				for (let i = 0; i < strings.length; i++) {
					if (strings[i]) {
						controller.enqueue(new TextEncoder().encode(strings[i]));
					}

					if (i < values.length) {
						const value = values[i];

						if (value instanceof ReadableStream) {
							const reader = value.getReader();

							while (true) {
								const { done, value: chunk } = await reader.read();
								if (done) break;
								controller.enqueue(chunk);
							}
						} else {
							const stringValue = String(value);
							if (stringValue) {
								controller.enqueue(new TextEncoder().encode(stringValue));
							}
						}
					}
				}
			} catch (error) {
				controller.error(error);
			}
			controller.close();
		},
	});
}
