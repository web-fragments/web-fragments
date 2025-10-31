import { parse, print, types } from 'recast';

export function transform(code: string, sourceFileName: string): { code: string; sourceMap: string } {
	const start = Date.now();
	const ast = parse(code, {
		sourceFileName: sourceFileName,
	});

	//appendHelloWorld(ast.program.body, sourceFileName);
	instrument(ast.program.body, sourceFileName);

	const transformed = print(ast, {
		sourceMapName: sourceFileName,
	});

	console.log(`Transformed ${sourceFileName} in ${Date.now() - start}ms`);
	return {
		code: transformed.code,
		sourceMap: transformed.map,
	};
}

function instrument(astBody: types.ASTNode[], sourceFileName: string) {
	types.visit(astBody, {
		visitFunctionDeclaration(path) {
			const functionEntryLog = types.builders.callStatement.from({
				callee: types.builders.identifier.from({ name: 'console.debug' }),
				arguments: [
					types.builders.literal.from({
						value: `${sourceFileName}: → ${path.node.id?.name}@${path.node.loc?.start.line}:${path.node.loc?.start.column}`,
					}),
				],
			});

			const functionDeclaration = path.node;

			functionDeclaration.body.body.unshift(functionEntryLog);
			this.traverse(path);
		},
	});
}

function appendHelloWorld(astBody: types.ASTNode[], sourceFileName: string) {
	const helloWorldConsoleLog = types.builders.callStatement.from({
		callee: types.builders.identifier.from({ name: 'console.log' }),
		arguments: [types.builders.literal.from({ value: `Hello World!! (from ${sourceFileName})` })],
	});
	astBody.push(helloWorldConsoleLog);
}
