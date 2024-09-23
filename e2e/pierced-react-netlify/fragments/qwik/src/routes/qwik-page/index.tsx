import {
	component$,
	useSignal,
	useStyles$,
	useVisibleTask$,
} from "@builder.io/qwik";
import { Link, type DocumentHead } from "@builder.io/qwik-city";

export default component$(() => {
	const counter = useSignal(0);

	useVisibleTask$(() => {
		counter.value += 50;
	});

	useStyles$(`
    .qwik-counter-page {
      background: #7dffbc;
      padding: 0.5rem;
      margin: 1rem;
      width: fit-content;
      color: black;

      p {
        margin-bottom: 0.5rem;
        text-align: center;
      }

      .counter {
        display: flex;
        gap: 1rem;
        min-width: 10rem;
        background: #e4e4e4;
        justify-content: space-between;
        padding: 0.5rem;
      }
    }
   `);

	return (
		<>
			<div class="qwik-counter-page">
				<Link href="/qwik-page/details">Go to details</Link>
				<div style={{ maxHeight: "10rem", overflow: "auto" }}>
					<p>Qwik Counter</p>
					<div class="counter">
						<button
							onClick$={() => {
								counter.value--;
							}}
						>
							-
						</button>
						<span>{counter.value}</span>
						<button
							onClick$={() => {
								counter.value++;
							}}
						>
							+
						</button>
					</div>
					{new Array(1000).fill(undefined).map((_element, idx) => (
						<div key={idx}>I am the {idx} element in this list of divs</div>
					))}
				</div>
			</div>
		</>
	);
});

export const head: DocumentHead = {
	title: "Welcome to Qwik",
	meta: [
		{
			name: "description",
			content: "Qwik site description",
		},
	],
};
