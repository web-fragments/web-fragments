import express from 'express';
import path from 'path';
import fs from 'fs';
import { FragmentGateway } from 'web-fragments/gateway';
import { getNodeMiddleware } from 'web-fragments/gateway/node';

const app = express();
const PORT = process.env.PORT || 3005;

const distPath = path.resolve('dist');


// Initialize the FragmentGateway
const gateway = new FragmentGateway({
    prePiercingStyles: `
      <style id="fragment-piercing-styles" type="text/css">
        fragment-host[data-piercing="true"] {
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
    prePiercingClassNames: ['remix'],
    routePatterns: ['/remix-page/:_*', '/_fragment/remix/:_*'],
    endpoint: 'http://localhost:3000',
    upstream: 'http://localhost:3000',
    onSsrFetchError: () => ({
        response: new Response('<p>Remix fragment not found</p>', {
            headers: { 'content-type': 'text/html' },
        }),
    }),
});

gateway.registerFragment({
    fragmentId: 'qwik',
    prePiercingClassNames: ['qwik'],
    routePatterns: ['/qwik-page/:_*', '/_fragment/qwik/:_*'],
    endpoint: 'http://localhost:8123',
    upstream: 'http://localhost:8123',
    forwardFragmentHeaders: ['x-fragment-name'],
    onSsrFetchError: () => ({
        response: new Response('<p>Qwik fragment not found</p>', {
            headers: { 'content-type': 'text/html' },
        }),
    }),
});

app.use(getNodeMiddleware(gateway, { mode: 'development' }));

app.use(express.static(distPath));
console.log('Serving static files from:', distPath);

app.use((req, res, next) => {
  if (req.url === '/' || req.url === '/index.html') {
	res.writeHead(200, { 'Content-Type': 'text/html' });
	res.end(fs.readFileSync(path.join(distPath, 'index.html')));
  } else {
	next();
  }
});

// Serve other pages manually
app.use((req, res, next) => {
  if (req.url.startsWith('/remix-page')) {
	  res.writeHead(200, { 'Content-Type': 'text/html' });
	  res.end(fs.readFileSync(path.join(distPath, 'remix-page.html')));
  } else if (req.url.startsWith('/qwik-page')) {
	  res.writeHead(200, { 'Content-Type': 'text/html' });
	  res.end(fs.readFileSync(path.join(distPath, 'qwik-page.html')));
  } else {
  	next();
  }
});


app.listen(PORT, () => {
    console.log(`Server running at http://localhost:${PORT}`);
});
