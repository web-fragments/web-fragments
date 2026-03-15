import { Link } from 'react-router-dom';
import AppHeader from '../components/AppHeader';

function Root() {
	const goTo = (url: string) => {
		window.history.pushState({}, '', url);
	};

	return (
		<>
			<AppHeader />
			<div className="app-shell">
				<main className="app-main">
					<section className="hero-card">
						<span className="hero-pill">Web API Middleware</span>
						<h1>Pierced React Sample </h1>
						<p>
							This sample showcases two independently built and deployed Remix and Qwik experiences, pierced inside this
							React host. Choose a framework to see web-fragments in action!
						</p>
						<div className="cta-group">
							<button
								onClick={() => {
									goTo('/remix-page');
								}}
							>
								Preload Remix fragment
							</button>
							<p className="hint">
								the history button updates the url without re-rendering, so you can observe piercing behavior.
							</p>
							<div className="link-group">
								<Link className="link-button" to="/remix-page">
									Open Remix Fragment
								</Link>
								<Link className="link-button secondary" to="/qwik-page">
									Open Qwik Fragment
								</Link>
								<Link className="link-button" to="/rr-page">
									Open React Router Fragment
								</Link>
							</div>
						</div>
						<p className="runtime-note">This fragment runs in runtimes that support Web Fetch API natively.</p>
					</section>
				</main>
				<footer className="app-footer">
					Sample built by the{' '}
					<a
						href="https://github.com/web-fragments/web-fragments/graphs/contributors"
						target="_blank"
						rel="noopener noreferrer"
					>
						web-fragments contributors
					</a>
					.
				</footer>
			</div>
		</>
	);
}

export default Root;
