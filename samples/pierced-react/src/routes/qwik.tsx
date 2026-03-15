import { useState } from 'react';
import reactLogo from '../assets/react.svg';
import qwikLogo from '../assets/qwik.svg';
import AppHeader from '../components/AppHeader';
import '../App.css';

function App() {
	const [count, setCount] = useState(0);
	const [showHost, setShowHost] = useState(false);

	const toggleShowHost = () => {
		setShowHost(!showHost);
	};

	return (
		<>
			<AppHeader />
			<div className="page-shell fragment-page">
				<div className="fragment-page__logos">
					<a href="https://react.dev" target="_blank">
						<img src={reactLogo} className="logo react" alt="React logo" />
					</a>
					<a href="https://vitejs.dev" target="_blank">
						<img src={qwikLogo} className="logo" alt="Qwik logo" />
					</a>
				</div>
				<h1>React + Qwik</h1>
				<div className="card">
					<button onClick={() => setCount((count) => count + 1)}>count is {count}</button>
				</div>

				<section className="fragment-showcase">
					<div className="fragment-container pierced">
						<h2>Pierced fragment</h2>
						<web-fragment fragment-id="qwik" />
					</div>
					<div className="fragment-container">
						<div style={{ width: '100%' }}>
							<h2>Fetched fragment</h2>
							<button
								onClick={toggleShowHost}
								style={{
									background: 'AliceBlue',
									padding: '0.5rem',
									color: 'black',
								}}
							>
								Toggle host
							</button>
						</div>
						{showHost && <web-fragment fragment-id="qwik2" />}
					</div>
				</section>
			</div>
		</>
	);
}

export default App;
