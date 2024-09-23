import type { MetaFunction } from "@remix-run/node";
import { useState } from "react";
import { Link } from "@remix-run/react";

export const meta: MetaFunction = () => {
	return [
		{ title: "New Remix Counter" },
		{ name: "description", content: "Welcome to a Remix Counter!" },
	];
};

export default function Index() {
	const [counter, setCounter] = useState(0);

	return (
		<>
			<div className="remix-counter-page">
				<style>{`
        .remix-counter-page {
          background: #00c4ff;
          padding: 0.5rem;
          margin: 1rem;
          width: fit-content;
          color: black;

          p {
            margin-bottom: 0.5rem;
            text-align: center;
          }

          .counter {
            display: flex;
            gap: 1rem;
            min-width: 10rem;
            background: #e4e4e4;
            justify-content: space-between;
            padding: 0.5rem;
          }
        }
  `}</style>
				<div style={{ maxHeight: "10rem", overflow: "auto" }}>
					<div style={{ display: "flex" }}>
						<Link
							to="/remix-page/details"
							style={{
								display: "block",
								padding: "0.5rem",
								margin: "1rem 0",
								backgroundColor: "#333",
								borderRadius: "5px",
								fontSize: "1rem",
								color: "#fff",
							}}
						>
							Go to /remix-page/details 👉
						</Link>
					</div>
					<p>Current Route: /remix-page</p>
					<div className="counter">
						<button
							onClick={() => {
								setCounter((counter) => counter - 1);
							}}
						>
							-
						</button>
						<span>{counter}</span>
						<button
							onClick={() => {
								setCounter((counter) => counter + 1);
							}}
						>
							+
						</button>
					</div>
					{new Array(1000).fill(undefined).map((_element, idx) => (
						<div key={idx}>I am the {idx} element in this list of divs</div>
					))}
				</div>
			</div>
		</>
	);
}
