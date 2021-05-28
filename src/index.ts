import * as path from 'path';
import { exit } from 'process';
import { LinuxPackageType, getArgv } from './config';
import { get as httpGet, listFiles, checkDirectoryExists, messageOfError } from './utils';
import { createDebRepoCook } from './deb-repo';
import { createRpmRepoCook } from './rpm-repo';
import { ArtifactoryItemMeta, createArtifactoryClient, readMetaPointerFromFile } from 's3-groundskeeper';


/**
 * 
 */
async function collectPackages(): Promise<{packageType: LinuxPackageType, packageFiles: string[]}> {
	const args = getArgv();
	const storageRoot = args.storageRoot;
	let packageType = args.packageType ?? 'auto';

	const lstForExt = (ext: string): Promise<string[]> => {
		return listFiles(storageRoot, (p: string): boolean => { 
			return path.extname(p) === ext;
		});
	}

	const debPackageFiles = (packageType === 'deb' || packageType === 'auto') ? await lstForExt('.deb') : [];
	const rpmPackageFiles = (packageType === 'deb' || packageType === 'rpm') ? await lstForExt('.rpm') : [];

	if (debPackageFiles.length !== 0 && rpmPackageFiles.length !== 0) {
		throw new Error('Fail to auto detect package type, because there is .rpm and .deb packages found at the same time');
	}
	else if (packageType === 'auto' && debPackageFiles.length === 0 && rpmPackageFiles.length === 0) {
		throw new Error('Package type is auto, but none .deb or .rpm packages are found.');
	}

	if (packageType === 'auto') {
		packageType = debPackageFiles.length > 0 ? 'deb' : 'rpm';
	}

	return { packageType, packageFiles: packageType === 'deb' ? debPackageFiles : rpmPackageFiles };
}

/**
 * 
 */
async function main(): Promise<number | void> {

	const args = getArgv();
	await checkDirectoryExists(args.storageRoot);

	const repoRoot = args.repoRoot ?? args.storageRoot;

	const {packageType, packageFiles} = await collectPackages();

	const repoCook: LinuxRepoCook = (() => {
		if (packageType === 'deb') {
			return createDebRepoCook();
		}
		else if (packageType === 'rpm') {
			return createRpmRepoCook();
		}
		
		// eslint-disable-next-line @typescript-eslint/restrict-template-expressions
		throw new Error(`Unknown package type: (${packageType})`);
	})();


	const packages: PackageEntry[] = [];

	const artifactory = createArtifactoryClient({
		protocol: 'https',
		host: args.artifactoryHost,
		apiKey: args.artifactoryApikey,
		user: args.artifactoryUser
	});

	console.log(`Cook the [${packageType}] repository:`);
	console.log(` * Storage: ${args.storageRoot}\n * Repository: ${repoRoot}\n\n`);
	

	for (const packageFilePath of packageFiles) {
		console.log(` * package file: ${packageFilePath}`)

		const metaPtr = await readMetaPointerFromFile(packageFilePath);
		if (!metaPtr) {
			throw new Error(`Only 'meta-pointer' files yet supported: ${packageFilePath}`)
		}

		if (metaPtr.source !== 'jfrogart') {
			throw new Error(`Unknown source (${metaPtr.source}) at ${packageFilePath}`);
		}

		const artQueryResult = await artifactory.query<ArtifactoryItemMeta>(`items.find({"${metaPtr.oid.kind}": "${metaPtr.oid.value}"}).include("*")`);
		if (artQueryResult.results.length === 0) {
			throw new Error(`No artifactory item found for ("${metaPtr.oid.kind}": "${metaPtr.oid.value}"}`);
		}
		else if (artQueryResult.results.length > 1) {
			throw new Error(`Expected single artifactory item for ("${metaPtr.oid.kind}": "${metaPtr.oid.value}"}`);
		}

		const item = artQueryResult.results[0];
		const itemPath = artifactory.resolveUri(item);
		const additionalFileNames = repoCook.additionalFileNames(path.basename(packageFilePath));
		const packageEntry: PackageEntry = {
			relPath: `./${path.relative(args.storageRoot, packageFilePath)}`,
			additionalContent: {}
		};
		console.log(`  > resolve artifactory item: ${itemPath}`);

		if (additionalFileNames) {
			for (const key of Object.getOwnPropertyNames(additionalFileNames)) {
				const fileName = additionalFileNames[key];
				const additionalItemPath = itemPath.replace(/[A-Za-z\-\.0-9_]+$/, fileName);
				try {
					const content = await httpGet(additionalItemPath);
					packageEntry.additionalContent[key] = content.toString('utf-8');
					console.log(`  > additional item [${key}]: ${additionalItemPath}`);
				}
				catch {
				}
			}
		}

		packages.push(packageEntry);
	}

	await repoCook.makeRepository({
		rootPath: repoRoot,
		packages
	});
}


process.on('unhandledRejection', () => {
	// console.debug('Unhandled promise rejection:');
	// console.debug(diag.messageOfError(error));
});


main()
	.then(code => {
			if (typeof code === 'number' && code !== 0) {
				exit(code);
			}

			console.log('Success.');
	})
	.catch((error: unknown) => {
		console.error('Error:');
		console.error(messageOfError(error));
		exit(-1);
	});
