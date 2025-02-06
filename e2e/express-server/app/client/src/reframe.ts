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

    if (counterButton) {
        counterButton.addEventListener('click', () => {
            const count = counterInstance.increment();
            counterButton.textContent = `click to count: ${count}`;
            console.log('Counter incremented to:', count);
        });
    }
});

register();