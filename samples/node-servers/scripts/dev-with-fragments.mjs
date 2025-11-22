import { spawn } from 'node:child_process';
import path from 'node:path';
import process from 'node:process';
import { fileURLToPath } from 'node:url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const nodeServersRoot = path.resolve(__dirname, '..');
const workspaceRoot = path.resolve(nodeServersRoot, '..', '..');

const PNPM_COMMAND = process.platform === 'win32' ? 'pnpm.cmd' : 'pnpm';

const fragments = [
	{ id: 'remix', filter: 'pierced-react___remix-fragment' },
	{ id: 'qwik', filter: 'pierced-react___qwik-fragment' },
	{ id: 'react-router', filter: 'pierced-react___react-router-fragment' },
];

const serverTarget = process.argv[2] ?? 'express';
const serverEntries = {
	express: 'app/server/src/express.ts',
	connect: 'app/server/src/connect.ts',
};

if (!Object.prototype.hasOwnProperty.call(serverEntries, serverTarget)) {
	console.error(`Unknown server target "${serverTarget}". Expected one of: ${Object.keys(serverEntries).join(', ')}`);
	process.exit(1);
}

const childProcesses = [];
let shuttingDown = false;

function spawnProcess(name, command, args, options) {
	const child = spawn(command, args, {
		stdio: 'inherit',
		env: process.env,
		...options,
	});

	childProcesses.push({ name, child });

	child.on('exit', (code, signal) => {
		if (shuttingDown) {
			return;
		}
		const reason = signal ? `signal ${signal}` : `code ${code}`;
		console.error(`\n[${name}] exited unexpectedly (${reason}). Shutting down remaining processes...`);
		shutdown(typeof code === 'number' ? code : 1);
	});

	child.on('error', (error) => {
		if (shuttingDown) {
			return;
		}
		console.error(`\n[${name}] failed to start:`, error);
		shutdown(1);
	});

	return child;
}

function shutdown(exitCode = 0) {
	if (shuttingDown) {
		return;
	}
	shuttingDown = true;

	for (const { child } of childProcesses) {
		if (!child.killed) {
			child.kill('SIGINT');
		}
	}

	setTimeout(() => {
		for (const { child } of childProcesses) {
			if (!child.killed) {
				child.kill('SIGKILL');
			}
		}
		process.exit(exitCode);
	}, 5_000).unref();
}

process.on('SIGINT', () => shutdown(0));
process.on('SIGTERM', () => shutdown(0));

if (process.stdin) {
	process.stdin.resume();
}

console.log('Starting fragments in parallel...');
for (const fragment of fragments) {
	spawnProcess(
		`fragment:${fragment.id}`,
		PNPM_COMMAND,
		['--filter', fragment.filter, 'serve'],
		{ cwd: workspaceRoot, env: { ...process.env, NODE_ENV: 'development' } },
	);
}

const serverEntry = serverEntries[serverTarget];
console.log(`Launching ${serverTarget} server...`);
const serverProcess = spawnProcess(
	`server:${serverTarget}`,
	'node',
	['--loader', 'ts-node/esm', serverEntry],
	{ cwd: nodeServersRoot },
);

serverProcess.on('exit', (code, signal) => {
	if (!shuttingDown) {
		const reason = signal ? `signal ${signal}` : `code ${code}`;
		console.log(`\nserver ${serverTarget} exited (${reason}). Stopping fragments...`);
	}
	shutdown(typeof code === 'number' ? code : 0);
});
