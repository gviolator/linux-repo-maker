import * as fs from 'fs';
import {join as pathJoin, resolve as pathResolve} from 'path';
import { spawnSync } from 'child_process';

export * from './http';


export function messageOfError(err: unknown): string {
	if (err === null || typeof err === 'undefined') {
		return '';
	}

	if (err instanceof Error) {
		return err.message;
	}
	if (typeof err === 'string') {
		return err;
	}
	if (typeof err === 'object') {
		return (err as {message?: string}).message ?? 'unknown error';
	}

	return 'unknown error type';
}


export async function checkDirectoryExists(targetDir: string): Promise<void> {

	if (!targetDir || targetDir.length === 0) {
		throw new Error('Required directory path is empty');
	}

	try {
		const stats = await fs.promises.stat(targetDir);
		if (!stats.isDirectory()) {
			throw new Error(`Is not directory: (${targetDir})`);
		}
	}
	catch {
		throw new Error(`Does not exists: (${targetDir})`);
	}
}


export async function ensureDirExists(targetDir: string, cleanup = false): Promise<void> {
	if (!fs.existsSync(targetDir)) {
		fs.mkdirSync(targetDir, {recursive: true});
		return;
	}
	else if (cleanup) {
		for (const name of await fs.promises.readdir(targetDir)) {
			const itemPath = pathJoin(targetDir, name);
			const stat = await fs.promises.lstat(itemPath);
			if (stat.isDirectory()) {
				fs.rmdirSync(itemPath, {recursive: true});
			}
			else {
				fs.unlinkSync(itemPath);
			}
		}
	}
}


export function listFiles(rootPath: string, filter?: (p: string )=> boolean ): Promise<string[]> {

	const iterateDirectory = async (dirPath: string): Promise<string[]> => {

		const lst: string[] = await fs.promises.readdir(dirPath);
		if (lst.length === 0) {
			return [];
		}

		const objects: string[] = [];
		const subworks: Array<Promise<string[]>> = [];

		for (const name of lst) {
			const fullPath = pathResolve(dirPath, name);
			// const key = path.relative(this.rootPath, fullPath);
			const stats = await fs.promises.lstat(fullPath);
			
			if (stats.isDirectory()) {
				subworks.push(iterateDirectory(fullPath));
			}
			else if (stats.isSymbolicLink() || stats.isFile()) {
				if (!filter || filter(fullPath)) {
					objects.push(fullPath);
				}
			}
		}

		return objects.concat( ... await Promise.all(subworks));
	};

	return iterateDirectory(rootPath);
}


export async function execToolToFile(tool: string, args: string[], outputPath?: string): Promise<void> {

	if (outputPath && fs.existsSync(outputPath)) {
		await fs.promises.unlink(outputPath);
	}

	const toolProcessResult = spawnSync(tool, args, {stdio: 'pipe', encoding: 'utf-8'});
	const toolOutput = toolProcessResult.stdout;

	const dumpToolOutput = (): void => {
		const toolErrOutput = toolProcessResult.stderr;
		if (toolOutput && toolOutput.length > 0) {
			console.log(toolOutput);
		}
		if (toolErrOutput && toolErrOutput.length > 0) {
			console.warn(toolErrOutput);
		}
	};

	if (outputPath) {
		console.log(`Execute ${tool} ${args.join(' ')} => ${outputPath}`);
		dumpToolOutput();
		await fs.promises.writeFile(outputPath, toolOutput);
	}
	else {
		console.log(`Execute ${tool} ${args.join(' ')}`);
		dumpToolOutput();
	}
}
