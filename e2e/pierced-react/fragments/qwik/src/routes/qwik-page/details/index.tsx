import { component$, useSignal, useStyles$ } from "@builder.io/qwik";
import { Link } from "@builder.io/qwik-city";

export default component$(() => {
	const counter = useSignal(0);

	useStyles$(`
    
 
      .counter {
        display: flex;
        gap: 1rem;
        min-width: 10rem;
        background: #e4e4e4;
        justify-content: space-between;
        padding: 0.5rem;
      }
    
   `);

	return (
		<section>
			<h1>Details Page</h1>
			<Link href="/qwik-page">← Go back to home</Link>
			<div
				style={{
					marginTop: "2rem",
					maxHeight: "20rem",
					maxWidth: "20rem",
					overflow: "auto",
				}}
			>
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
			</div>
		</section>
	);
});
