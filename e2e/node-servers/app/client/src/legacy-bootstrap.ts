import { register } from 'web-fragments/elements';

register();

function counter(): { increment: () => number; decrement: () => number } {
	let count = 0;

	return {
		increment() {
			count++;
			return count;
		},
		decrement() {
			count--;
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
                <h2>Reframed - from target</h2>
                <fragment-outlet fragment-id="${fwName}" />
            </div>
            <div class="fragment-container">
                <h2>Reframed - with fetch</h2>
                <button class="button" id="toggle-host">Toggle Host</button>
                <div class="host-wrapper" style="display: none;">
                    <fragment-host></fragment-host>
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
		toggle.addEventListener('click', () => {
			const hostWrapper = document.querySelector('.host-wrapper') as HTMLElement;
			if (hostWrapper.style.display === 'none') {
				hostWrapper.style.display = 'block';
				hostWrapper.style.visibility = 'visible';
			} else {
				hostWrapper.style.display = 'none';
				hostWrapper.style.visibility = 'hidden';
			}
		});
	}
});
