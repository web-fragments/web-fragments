import type { MetaFunction } from "@remix-run/node";
import { Suspense } from "react";
import { Link, useLoaderData, Await } from "@remix-run/react";
import { defer } from "@remix-run/node";

export const meta: MetaFunction = () => {
	return [
		{ title: "New Remix Counter" },
		{ name: "description", content: "Welcome to a Remix Counter!" },
	];
};

export const loader = async () => {
	const pendingStatus = () =>
		new Promise<string>((resolve) => {
			setTimeout(() => {
				resolve("ok");
			}, 500);
		});

	return defer({
		status: pendingStatus(),
	});
};

export default function Index() {
	const data = useLoaderData<typeof loader>();

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
							to="/remix-page"
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
							👈 Go to /remix-page
						</Link>
					</div>
					<p>Current Route: /remix-page/details</p>
					<Suspense fallback={<p>Pending status...</p>}>
						<Await resolve={data.status}>
							{(status) => <p>Success status: {status}</p>}
						</Await>
					</Suspense>
				</div>
			</div>
		</>
	);
}
