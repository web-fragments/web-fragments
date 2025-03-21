import { Link } from 'react-router-dom';

function App() {
	const goTo = (url: string) => {
		window.history.pushState({}, '', url);
	};

	return (
		<div className="index-page">
			<button
				onClick={() => {
					goTo('/remix-page');
				}}
			>
				Remix Page (window.history.pushState)
			</button>
			<p style={{ fontSize: '1rem', fontStyle: 'italic', marginTop: '-1rem' }}>
				Note: Clicking this button should update the URL but not the UI.
			</p>
			<Link to="/remix-page">Remix Page</Link>
			<Link to="/qwik-page">Qwik Page</Link>
			<web-fragment fragment-id="party-button" src="__wf/dev.web-fragments.demos.party-button/"></web-fragment>
		</div>
	);
}

export default App;
