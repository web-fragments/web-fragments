import type { MetaFunction } from "@remix-run/node";
import { useEffect, useRef } from "react";

import { reframed } from "reframed";

export const meta: MetaFunction = () => {
  return [
    { title: "New Remix App" },
    { name: "description", content: "Welcome to Remix!" },
  ];
};

export default function Index() {
  const ref = useRef<HTMLElement>(null);
  useEffect(() => {
    (async () => {
      if (document.unreframedBody) return;
      const reframedContainer = ref.current;
      if (!reframedContainer) return;
      await reframed("/counter", { container: reframedContainer });
    })();
  }, []);

  return (
    <div className="font-sans p-4">
      <h1 className="text-3xl">Welcome to Remix</h1>
      <ul className="list-disc mt-4 pl-6 space-y-2">
        <li>
          <a
            className="text-blue-700 underline visited:text-purple-900"
            target="_blank"
            href="https://remix.run/start/quickstart"
            rel="noreferrer"
          >
            5m Quick Start
          </a>
        </li>
        <li>
          <a
            className="text-blue-700 underline visited:text-purple-900"
            target="_blank"
            href="https://remix.run/start/tutorial"
            rel="noreferrer"
          >
            30m Tutorial
          </a>
        </li>
        <li>
          <a
            className="text-blue-700 underline visited:text-purple-900"
            target="_blank"
            href="https://remix.run/docs"
            rel="noreferrer"
          >
            Remix Docs
          </a>
        </li>
      </ul>
      <article
        style={{
          border: "6px dashed red",
          scale: "60%",
          display: "grid",
          placeContent: "center",
        }}
        ref={ref}
      ></article>
    </div>
  );
}
