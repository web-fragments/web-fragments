import { Link } from "react-router-dom";

function App() {
	return (
		<div className="index-page">
			<Link to="/remix-page">Remix Page</Link>
			<Link to="/qwik-page">Qwik Page</Link>
		</div>
	);
}

export default App;
