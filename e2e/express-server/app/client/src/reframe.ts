import { register } from 'web-fragments/elements';

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

    register();
});

