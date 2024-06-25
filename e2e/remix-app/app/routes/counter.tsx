import { useRef, useState, useEffect } from "react";

export default function Counter() {
  const [shouldReframe, setShouldReframe] = useState(false);
  const [counter, setCounter] = useState(0);

  const ref = useRef<HTMLElement>(null);

  useEffect(() => {
    (async () => {
      if (!document.unreframedBody) {
        setShouldReframe(true);
      }

      const { reframed } = await import("reframed");
      const reframedContainer = ref.current;
      if (!reframedContainer) return;
      await reframed("/counter", { container: reframedContainer });
    })();
  }, []);

  return (
    <>
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
      {shouldReframe && (
        <article
          style={{
            border: "6px dashed red",
            scale: "60%",
            display: "grid",
            placeContent: "center",
          }}
          ref={shouldReframe ? ref : undefined}
        ></article>
      )}
    </>
  );
}
