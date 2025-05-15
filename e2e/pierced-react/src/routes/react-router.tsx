import { useState } from 'react';
import reactLogo from '../assets/react.svg';
import remixLogo from '../assets/remix.svg';
import '../App.css';
import { Link, Route, Routes } from 'react-router-dom';

function App() {
	const [count, setCount] = useState(0);
	const [showHost, setShowHost] = useState(false);
	const toggleShowHost = () => {
		setShowHost(!showHost);
	};

	return (
		<>
			<div>
				<a href="https://react.dev" target="_blank">
					<img src={reactLogo} className="logo react" alt="React logo" />
				</a>
				<a href="https://vitejs.dev" target="_blank">
					<img src={remixLogo} className="logo" alt="Remix logo" />
				</a>
			</div>
			<h1>React + React Router</h1>
			<Routes>
				<Route
					index
					element={
						<Link
							to="/react-router/details"
							style={{
								display: 'inline-block',
								padding: '0.5rem',
								margin: '1rem auto',
								backgroundColor: '#333',
								borderRadius: '5px',
								fontSize: '1rem',
								color: '#fff',
							}}
						>
							Go to /react-router/details 👉
						</Link>
					}
				/>
				<Route
					path="/details"
					element={
						<Link
							to="/react-router"
							style={{
								display: 'inline-block',
								padding: '0.5rem',
								margin: '1rem auto',
								backgroundColor: '#333',
								borderRadius: '5px',
								fontSize: '1rem',
								color: '#fff',
							}}
						>
							👈 Go to /react-router
						</Link>
					}
				/>
			</Routes>

			<p
				style={{
					fontSize: '1rem',
					fontStyle: 'italic',
					margin: '0 auto',
					maxWidth: '760px',
				}}
			>
				Note: Clicking this button should update the fragment UI and the main window URL. However, the host application
				is still rendering the same page (there is only one route defined at /remix-page/*)
			</p>
			<div className="card">
				<button onClick={() => setCount((count) => count + 1)}>count is {count}</button>
			</div>

			<section style={{ display: 'flex', justifyContent: 'center' }}>
				<div className="fragment-container pierced">
					<div style={{ width: '100%',  }}>
            <h2>Pierced fragment</h2>
          </div>
					<web-fragment fragment-id="react-router" />
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
					{showHost && <web-fragment fragment-id="react-router2" />}
				</div>
			</section>
		</>
	);
}

export default App;
