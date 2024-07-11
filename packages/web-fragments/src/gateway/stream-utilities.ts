/**
 * Generates a stream which wraps a provided stream into two strings.
 *
 * For example given the two strings 'start' and 'end' and the stream
 * _s_ it generates a stream which emits 'start', all the chunks of
 * _s_ and then 'end'
 *
 * @param preStream the string to emit before the stream content
 * @param postStream the string to emit after the stream content
 * @param stream the stream to wrap
 * @returns a new stream
 */
export function wrapStreamInText(
	preStream: string,
	postStream: string,
	stream: ReadableStream<Uint8Array>
): ReadableStream {
	const { writable, readable } = new TransformStream();
	const writer = writable.getWriter();
	writeIntoEmbeddedStream(preStream, postStream, stream, writer);
	return readable;
}

/**
 * Transforms a stream by applying the provided transformerFn on each chunk.
 *
 * @param stream the input stream to be transformed
 * @param transformerFn the function to be applied to each chunk
 * @returns a transformed stream
 */
export function transformStream(
	stream: ReadableStream<Uint8Array>,
	transformerFn: (str: string) => string
) {
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

async function writeIntoEmbeddedStream(
	preStream: string,
	postStream: string,
	stream: ReadableStream<Uint8Array>,
	writer: WritableStreamDefaultWriter<any>
): Promise<void> {
	try {
		const encoder = new TextEncoder();
		writer.write(encoder.encode(preStream));

		const reader = stream.getReader();
		let chunk = await reader.read();
		while (!chunk.done) {
			writer.write(chunk.value);
			chunk = await reader.read();
		}

		writer.write(encoder.encode(postStream));
		writer.close();
	} catch (error: any) {
		writer.abort(error);
	}
}

/**
 * Generates a stream which is the result of the concatenation of different
 * streams, meaning that it generates a stream which emits in order all
 * the chunks emitted by the provided streams.
 *
 * @param streams the streams to concatenate
 * @returns a new stream
 */
export function concatenateStreams(streams: ReadableStream[]): ReadableStream {
	async function writeStreams(
		writer: WritableStreamDefaultWriter
	): Promise<void> {
		try {
			for (const stream of streams) {
				const reader = stream.getReader();
				let chunk = await reader.read();
				while (!chunk.done) {
					writer.write(chunk.value);
					chunk = await reader.read();
				}
			}
			writer.close();
		} catch (error: any) {
			writer.abort(error);
		}
	}

	const { writable, readable } = new TransformStream();
	const writer = writable.getWriter();
	writeStreams(writer);
	return readable;
}
