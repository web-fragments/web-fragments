import connect from 'connect';
import http from 'http';
import serveStatic from 'serve-static';
import path from 'path';
import fs from 'fs';
import { getNodeMiddleware } from 'web-fragments/gateway/node';
import { FragmentGateway } from 'web-fragments/gateway';

const app = connect();
const PORT = process.env.PORT || 3006;
const SERVER_LABEL = 'Node.js (Connect API) Middleware';

// Initialize the FragmentGateway
const gateway = new FragmentGateway({
    piercingStyles: `
      <style id="fragment-piercing-styles" type="text/css">
        web-fragment-host[data-piercing="true"] {
          position: absolute;
          z-index: 1;
          top: 280px;
          left: 100px;

          @media (min-width: 768px) {
            top: 300px;
            left: 230px;
          }
        }
      </style>
    `,
});

// Register fragments
gateway.registerFragment({
	fragmentId: 'remix',
	piercingClassNames: ['remix'],
	routePatterns: ['/remix-page/:_*', '/_fragment/remix/:_*'],
	endpoint: 'http://localhost:3000',
	onSsrFetchError: () => ({
		response: new Response('<p>Remix fragment not found</p>', {
			headers: { 'content-type': 'text/html' },
		}),
	}),
});

gateway.registerFragment({
	fragmentId: 'qwik',
	piercingClassNames: ['qwik'],
	routePatterns: ['/qwik-page/:_*', '/_fragment/qwik/:_*'],
	endpoint: 'http://localhost:8123',
	forwardFragmentHeaders: ['x-fragment-name'],
	onSsrFetchError: () => ({
		response: new Response('<p>Qwik fragment not found</p>', {
			headers: { 'content-type': 'text/html' },
		}),
	}),
});

gateway.registerFragment({
	fragmentId: 'react-router',
	piercingClassNames: ['react-router'],
	routePatterns: ['/rr-page/:_*', '/_fragment/react-router/:_*'],
	endpoint: 'http://localhost:3001',
	onSsrFetchError: () => ({
		response: new Response('<p>React Router fragment not found</p>', {
			headers: { 'content-type': 'text/html' },
		}),
	}),
});

app.use(getNodeMiddleware(gateway, { mode: 'development' }));


const distPath = path.resolve(process.cwd(), 'dist');
const renderPage = (file: string) =>
  fs.readFileSync(path.join(distPath, file), 'utf-8').replace(/__SERVER_LABEL__/g, SERVER_LABEL);

const serveHtml = (res: http.ServerResponse, file: string) => {
  res.writeHead(200, { 'Content-Type': 'text/html; charset=utf-8' });
  res.end(renderPage(file));
};
console.log('Serving static files from:', distPath);
app.use(serveStatic(distPath));

app.use((req, res, next) => {
  if (req.url === '/' || req.url === '/index.html') {
    serveHtml(res, 'index.html');
  } else {
    next();
  }
});

// Serve other pages manually
app.use((req, res, next) => {
  if (req.url!.startsWith('/remix-page')) {
	serveHtml(res, 'remix-page.html');
  } else if (req.url!.startsWith('/qwik-page')) {
	serveHtml(res, 'qwik-page.html');
  } else if (req.url!.startsWith('/rr-page')) {
	serveHtml(res, 'rr-page.html');
  } else {
    next();
  }
});

// Start server
const server = http.createServer(app);
server.listen(PORT, () => {
  console.log(`Server running at http://localhost:${PORT}`);
});
