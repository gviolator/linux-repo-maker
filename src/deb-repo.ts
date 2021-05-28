import * as fs from 'fs';
import * as path from 'path';

import { getArgv } from './config';
import { execToolToFile, ensureDirExists } from './utils';


const ReleaseFileTemplate = 
`Origin: desktop stable
Label: desktop stable
Archive: $DIST
Architecture: $ARCH
Component: $COMPONENT
Codename: tradingview
`;

/**
 * 
 */
function generateDistReleaseFile(distPath: string): Promise<void> {
	const releaseFilePath = path.join(distPath, 'Release');
	return execToolToFile('apt-ftparchive', ['release', distPath], releaseFilePath);
}

/**
 * 
 */
async function subscribeRelease(distPath: string, keyName: string): Promise<void> {
	const releaseFilePath = path.join(distPath, 'Release');
	const releaseGpgFilePath = path.join(distPath, 'Release.gpg');
	const inReleaseFilePath = path.join(distPath, 'InRelease');

	await execToolToFile('gpg', ['--default-key', keyName, '-abs', '-o', releaseGpgFilePath, releaseFilePath]);
	await execToolToFile('gpg', ['--default-key', keyName, '--clearsign', '-o', inReleaseFilePath, releaseFilePath]);
}


function makeChangeLogFilePath(debFilePath: string): string {
	const dirName = path.dirname(debFilePath);
	const baseName = path.basename(debFilePath, '.deb');

	return dirName.length === 0 ? baseName + '.changelog' : path.join(dirName, baseName + '.changelog');

}

interface DebFileAdditionalContent extends Record<string, unknown>{
	meta: string;
	changeLog?: string;
}

/**
 * 
 */
class DebRepoCook implements LinuxRepoCook {

	/**
	 * 
	 */
	additionalFileNames(fileName: string): Record<string, string> | undefined {
		return {
			meta: `${fileName}.meta`,
			changeLog: makeChangeLogFilePath(fileName)
		};
	}

	/**
	 * 
	 */
	async makeRepository(repo: RepositoryInfo): Promise<void> {

		const {debDist, debComponent, gpgKeyName} = getArgv();

		const appendLine = (text: string, line: string): string => {
			const lines = text.split('\n').filter(l => l.length > 0);
			lines.push(line);
			return lines.join('\n');
		}

		const distRoot = path.join(repo.rootPath, 'dists', debDist);
		const packages: Record<string, string> = {};

		for (const debPackage of repo.packages) {
			const additionalContent = debPackage.additionalContent as DebFileAdditionalContent;
			if (!additionalContent.meta || additionalContent.meta.length === 0) {
				throw new Error(`Invalid meta for: ${debPackage.relPath}`);
			}

			let metaContent = additionalContent.meta;
	
			const res = /Architecture:\s*(\S+)/.exec(metaContent);
			const arch = res ? res[1] : 'amd64';
	
			metaContent = appendLine(metaContent, `Filename: ${debPackage.relPath}`);
	
			if (arch in packages) {
				packages[arch] = packages[arch] + '\n\n' + metaContent;
			}
			else {
				packages[arch] = metaContent;
			}

			if (additionalContent.changeLog && additionalContent.changeLog.length > 0) {
				const changeLogFilePath = path.join(repo.rootPath, makeChangeLogFilePath(debPackage.relPath));
				if (fs.existsSync(changeLogFilePath)) {
					console.log(`Change log file already exists, will not be overwritten: ${changeLogFilePath}`);
				}
				else {
					const changeLogContent = additionalContent.changeLog;
					console.log(`Create change log file: ${changeLogFilePath}:`);
					console.log(changeLogContent);

					await fs.promises.writeFile(changeLogFilePath, changeLogContent);
				}
				
			}
		}
	
		for (const arch of Object.getOwnPropertyNames(packages)) {
			const componentRoot = path.join(distRoot, debComponent, `binary-${arch}`);
			const packagesContent = packages[arch];
			const packagesPath = path.join(componentRoot, 'Packages');
			const releasePath = path.join(componentRoot, 'Release');
	
			await ensureDirExists(componentRoot);
	
			console.log(`compose Packages: ${packagesPath}`);
			await fs.promises.writeFile(packagesPath, packagesContent, {encoding: 'utf-8'});
	
			if (!fs.existsSync(releasePath)) {
				const releaseContent = ReleaseFileTemplate
					.replace('$ARCH', arch)
					.replace('$DIST', debDist)
					.replace('$COMPONENT', debComponent);
	
				console.log(`compose Release: ${releasePath}:`);
				console.log(releaseContent);
				await fs.promises.writeFile(releasePath, releaseContent, {encoding: 'utf-8'});
			}
		}

		await generateDistReleaseFile(distRoot);

		if (gpgKeyName) {
			await subscribeRelease(distRoot, gpgKeyName);
		}
		else {
			console.warn('Key name is not specified. Release file will not be created.');
			for (const filePath of [path.join(distRoot, 'Release.gpg'), path.join(distRoot, 'InRelease')]) {
				if (fs.existsSync(filePath)) {
					console.log(`Remove: ${filePath}`);
					fs.unlinkSync(filePath);
				}
			}
		}
	}
}

/**
 * 
 */
export function createDebRepoCook(): LinuxRepoCook {
  return new DebRepoCook();
}