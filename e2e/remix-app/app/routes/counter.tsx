import { useRef, useState, useEffect } from "react";

export function loader() {
  // TODO...
  return false;
}

export default function Counter() {
  const [counter, setCounter] = useState(0);

  const ref = useRef<HTMLElement>(null);

  if (!globalThis.document?.unreframedBody || (!globalThis.document && isThisAFetchRequestFromReframed) ) {
    useEffect(() => {
        (async () => {
          const {reframed} = await import('reframed');
          const reframedContainer = ref.current;
          if (!reframedContainer) return;
          await reframed("/counter", { container: reframedContainer });
        })();
    }, []);

    return (
      <>
        <h1>hello from parent remix</h1>
        <article
          style={{
            border: "6px dashed red",
            scale: "60%",
            display: "grid",
            placeContent: "center",
          }}
          ref={ref}
        ></article>
      </>
    )
  }

  return (
    <div>
      <style>{`
        .counter {
            margin: 1rem;
            display: flex;
            gap: 1rem;
            width: 15rem;
            background: #e4e4e4;
            justify-content: space-between;
            padding: 0.5rem;
        }
      `}</style>
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
  );
}
