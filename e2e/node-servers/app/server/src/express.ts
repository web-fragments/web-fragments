import express from 'express';
import path from 'path';
import { FragmentGateway } from 'web-fragments/gateway';
import { getNodeMiddleware } from 'web-fragments/gateway/node';
import { IncomingMessage, ServerResponse } from 'http';

const app = express();
const PORT = process.env.PORT || 3005;

const distPath = path.resolve('dist');
app.use(express.static(distPath));

// Initialize the FragmentGateway
const gateway = new FragmentGateway({
    prePiercingStyles: `
      <style id="fragment-piercing-styles" type="text/css">
        fragment-host[data-piercing="true"] {
          position: absolute;
          z-index: 9999999999999999999999999999999;
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

const middleware = getNodeMiddleware(gateway, {
    mode: 'development',
}) as unknown as (req: IncomingMessage, res: ServerResponse, next: express.NextFunction) => void;

app.use((req: express.Request, res: express.Response, next: express.NextFunction) => {
    middleware(req as unknown as IncomingMessage, res as unknown as ServerResponse, next);
});

interface CustomRequest extends express.Request {}
interface CustomResponse extends express.Response {
    sendFile: (path: string) => void;
}

app.get('/:page', (req: CustomRequest, res: CustomResponse) => {
    const page = req.params.page;
    const filePath = path.join(distPath, `${page}.html`);
    
    console.log(`${page} Page Requested`);
    res.sendFile(filePath);
});

app.listen(PORT, () => {
    console.log(`Server running at http://localhost:${PORT}`);
});
