import type { MetaFunction } from "@remix-run/node";
import { useState } from "react";

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
          width: fix-content;

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
        <p>Remix Counter</p>
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
      </div>
    </>
  );
}
