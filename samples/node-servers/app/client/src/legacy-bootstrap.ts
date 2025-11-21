import { initializeWebFragments } from 'web-fragments';

initializeWebFragments();

function counter(): { increment: () => number } {
	let count = 0;

	return {
		increment() {
			count++;
			return count;
		},
	};
}

document.addEventListener('DOMContentLoaded', () => {
	const fwName = new URL(location.href).pathname.match(/\/(?<fwName>[^-]+)-page/)?.groups?.fwName;
	const main = document.querySelector('main') as HTMLElement;
	main.innerHTML = `<button title="This is an independent JavaScript component" class="button counter" id="counter">click to count: 0</button>
    <section>
        <div class="wrapper">
            <div class="fragment-container">
                <h2>Pierced fragment</h2>
                <web-fragment fragment-id="${fwName}"></web-fragment>
            </div>
            <div class="fragment-container">
                <h2>Fetched fragment</h2>
                <button class="button" id="toggle-host">Toggle Host</button>
                <div class="host-wrapper">
                </div>
            </div>
        </div>
    </section>`;

	const counterButton = document.getElementById('counter');
	const counterInstance = counter();

	const toggle = document.getElementById('toggle-host');

	if (counterButton) {
		counterButton.addEventListener('click', () => {
			const count = counterInstance.increment();
			counterButton.textContent = `click to count: ${count}`;
			console.log('Counter incremented to:', count);
		});
	}

	if (toggle) {
		let toggled = false;

		toggle.addEventListener('click', () => {
			const hostWrapper = document.querySelector('.host-wrapper') as HTMLElement;
			if (!toggled) {
				toggled = true;
				const fragment = document.createElement('web-fragment');
				fragment.setAttribute('fragment-id', `${fwName}2`);
				hostWrapper.appendChild(fragment);
			} else {
				toggled = false;
				hostWrapper.innerHTML = '';
			}
		});
	}
});
