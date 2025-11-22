import { Link } from 'react-router';

export const meta = () => {
	return [
		{ title: 'React Router Counter Details' },
		{ name: 'description', content: 'React Router Counter Details Page' },
	];
};

export default function RRPageDetails() {
	return (
		<>
			<div className="rr-counter-page">
				<style>{`
        .rr-counter-page {
          background: #e74c3c;
          padding: 0.5rem;
          margin: 1rem;
          width: fit-content;
          color: white;

          p {
            margin-bottom: 0.5rem;
            text-align: center;
          }
        }
  `}</style>
				<Link
					to="/rr-page"
					style={{
						display: 'block',
						padding: '0.5rem',
						margin: '1rem 0',
						backgroundColor: '#333',
						borderRadius: '5px',
						fontSize: '1rem',
						color: '#fff',
					}}
				>
					👈 Go to /rr-page
				</Link>
				<p>Current Route: /rr-page/details</p>
			</div>
		</>
	);
}
