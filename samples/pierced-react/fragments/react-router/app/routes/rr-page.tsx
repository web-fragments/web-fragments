import { useState } from "react";
import { Link } from "react-router";

export const meta = () => {
  return [
    { title: "React Router Counter" },
    { name: "description", content: "Welcome to a React Router Counter!" },
  ];
};

export default function RRPage() {
  const [counter, setCounter] = useState(0);

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

          .counter {
            display: flex;
            gap: 1rem;
            min-width: 10rem;
            background: #e4e4e4;
            justify-content: space-between;
            padding: 0.5rem;
            color: black;
          }
        }
  `}</style>
        <div style={{ maxHeight: "10rem", overflow: "auto" }}>
          <div style={{ display: "flex" }}>
            <Link
              to="/rr-page/details"
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
              Go to /rr-page/details 👉
            </Link>
          </div>
          <p>Current Route: /rr-page</p>
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
            <button onClick={() => navigator.clipboard.writeText(counter.toString())}>
              copy
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
