import { useState } from "react";
import reactLogo from "./assets/react.svg";
import viteLogo from "/vite.svg";
import "./App.css";

function App() {
	const [count, setCount] = useState(0);
	const [showHost, setShowHost] = useState(false);

	const toggleShowHost = () => {
		setShowHost(!showHost);
	};

	return (
		<>
			<div>
				<a href="https://vitejs.dev" target="_blank">
					<img src={viteLogo} className="logo" alt="Vite logo" />
				</a>
				<a href="https://react.dev" target="_blank">
					<img src={reactLogo} className="logo react" alt="React logo" />
				</a>
			</div>
			<h1>Vite + React</h1>
			<div className="card">
				<button onClick={() => setCount((count) => count + 1)}>
					count is {count}
				</button>
			</div>

			<section style={{ display: "flex", justifyContent: "center" }}>
				<div className="fragment-container pierced">
					<h2>Reframed - from target</h2>
					<fragment-outlet fragment-id="remix" />
				</div>
				<div className="fragment-container">
					<div style={{ width: "100%" }}>
						<h2>Reframed - with fetch</h2>
						<button
							onClick={toggleShowHost}
							style={{
								background: "AliceBlue",
								padding: "0.5rem",
								color: "black",
							}}
						>
							Toggle host
						</button>
					</div>
					{showHost && <fragment-host></fragment-host>}
				</div>
			</section>
		</>
	);
}

export default App;
