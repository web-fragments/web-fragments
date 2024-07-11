import { Link } from "@remix-run/react";
import { useState } from "react";

export default function Counter() {
	const [counter, setCounter] = useState(0);

	return (
		<>
			<div>
				<style>{`
    .counter {
        margin: 1rem;
        display: flex;
        gap: 1rem;
        width: 15rem;
        background: #FF3DC1;
        color: #CFFF04;
        justify-content: space-between;
        padding: 0.5rem;
        border-radius: 5rem;
    }
  `}</style>
				<Link to={"/counter"}>go to plain counter</Link>
				<div className="counter">
					<button
						onClick={() => {
							setCounter((counter) => counter - 1);
						}}
					>
						👈
					</button>
					<span>⭐{counter}⭐</span>
					<button
						onClick={() => {
							setCounter((counter) => counter + 1);
						}}
					>
						👉
					</button>
				</div>
			</div>
		</>
	);
}
