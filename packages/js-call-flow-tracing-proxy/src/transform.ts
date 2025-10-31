import { parse, print, types } from 'recast';

export function transform(code: string, sourceFileName: string): { code: string; sourceMap: string } {
	const start = Date.now();
	const ast = parse(code, {
		sourceFileName: sourceFileName,
	});

	appendHelloWorld(ast.program.body, sourceFileName);

	const transformed = print(ast, {
		sourceMapName: sourceFileName,
	});

	console.log(`Transformed ${sourceFileName} in ${Date.now() - start}ms`);
	return {
		code: transformed.code,
		sourceMap: transformed.map,
	};
}

function appendHelloWorld(astBody: types.ASTNode[], sourceFileName: string) {
	const helloWorldConsoleLog = types.builders.callStatement.from({
		callee: types.builders.identifier.from({ name: 'console.log' }),
		arguments: [types.builders.literal.from({ value: `Hello World!! (from ${sourceFileName})` })],
	});
	astBody.push(helloWorldConsoleLog);
}
