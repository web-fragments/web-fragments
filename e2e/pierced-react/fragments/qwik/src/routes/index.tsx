import { component$, useStyles$ } from '@builder.io/qwik';
import { Link, type DocumentHead } from '@builder.io/qwik-city';

export default component$(() => {
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
			<Link href="/qwik-page">Go To Counter</Link>
		</>
	);
});

export const head: DocumentHead = {
	title: 'Welcome to Qwik',
	meta: [
		{
			name: 'description',
			content: 'Qwik site description',
		},
	],
};
