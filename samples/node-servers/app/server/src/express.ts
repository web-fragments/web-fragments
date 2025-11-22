import express from 'express';
import path from 'path';
import fs from 'fs';
import { FragmentGateway } from 'web-fragments/gateway';
import { getNodeMiddleware } from 'web-fragments/gateway/node';

const app = express();
const PORT = process.env.PORT || 3005;

const distPath = path.resolve('dist');
const SERVER_LABEL = 'Node.js (Express) Middleware';

const renderPage = (file: string) =>
  fs.readFileSync(path.join(distPath, file), 'utf-8').replace(/__SERVER_LABEL__/g, SERVER_LABEL);

const sendPage = (res: express.Response, file: string) => {
  res.status(200).type('html').send(renderPage(file));
};


// Initialize the FragmentGateway
const gateway = new FragmentGateway({
    piercingStyles: `
      <style id="fragment-piercing-styles" type="text/css">
        web-fragment-host[data-piercing="true"] {
          position: absolute;
          z-index: 1;
          top: 280px;
          right: calc(50% + 150px);

          @media (min-width: 768px) {
            top: 320px;
            right: calc(50% - 15px);
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

app.use(getNodeMiddleware(gateway, { mode: 'production' }));

app.use(express.static(distPath));
console.log('Serving static files from:', distPath);

app.use((req, res, next) => {
  if (req.url === '/' || req.url === '/index.html') {
    sendPage(res, 'index.html');
  } else {
    next();
  }
});

// Serve other pages manually
app.use((req, res, next) => {
  if (req.url.startsWith('/remix-page')) {
    sendPage(res, 'remix-page.html');
  } else if (req.url.startsWith('/qwik-page')) {
    sendPage(res, 'qwik-page.html');
  } else if (req.url.startsWith('/rr-page')) {
    sendPage(res, 'rr-page.html');
  } else {
  next();
  }
});


app.listen(PORT, () => {
    console.log(`Server running at http://localhost:${PORT}`);
});
