import yargs, { Argv } from 'yargs';


export type LinuxPackageType = 'rpm' | 'deb';
 
export interface ProcessArgv {
	storageRoot: string;
	repoRoot?: string;
	packageType?: LinuxPackageType | 'auto';
	artifactoryHost: string;
	artifactoryUser: string;
	artifactoryApikey: string;
	debDist: string;
	debComponent: string;
	gpgKeyName: string;
	['dry-run']: boolean;
}

let procArgs: ProcessArgv | undefined;

function setupArgv(): ProcessArgv {
	const argv = (yargs(process.argv) as unknown as Argv)
		.option('storage-root', {  alias: 's', demand: true, description: 'directory to scan'})
		.option('repo-root', {  alias: 'r', demand: false, description: 'source directory'})
		.option('package-type', {  alias: 'p', demand: false, default:'auto', description: 'package system to be used: rpm, deb or auto (by default)'})
		.option('artifactory-host', { demand: true, description: 'jfrog Artifatory host'})
		.option('artifactory-user', { demand: true, description: 'jfrog Artifatory user'})
		.option('artifactory-apikey', { demand: true, description: 'jfrog Artifatory user\'s Api key' })
		.option('deb-dist', {demand: false, default: 'stable', description: 'Debian repo. dist. name. Default: stable'})
		.option('deb-component', {demand: false, default: 'main', description: 'Debian repo. component name. Default: main'})
		.option('dry-run', { alias: 'n', demand: false, default: false, ['boolean']: true, description: 'Dry run: do nothing only prints what to do.'})
		.option('gpg-key-name', { alias: 'k', demand: false, description: 'Security key name.'})
		.option('show-conf', { demand: false, default: false, ['boolean']: true, description: 'Print json object for the used configuration'})
		.version(require('package.json').version)
		.argv;

	if ((argv as unknown as {['show-conf']?: boolean})['show-conf'] ?? false) {
		console.log(`Used confuguration:\n${JSON.stringify(argv, undefined, 1)}`);
	}

	return argv as unknown as ProcessArgv;
}

export function getArgv(): ProcessArgv {
	if (!procArgs) {
		procArgs = setupArgv();
	}

	return procArgs;
}

// export interface ContentMeta {
// 	contentType?: string;
// }

// interface ContentMetaEntry extends ContentMeta {
// 	glob: string | string [];
// }

// function globMatch(value: string, pattern?: string | string[]): boolean {
// 	if (!pattern) {
// 		return false;
// 	}

// 	const checkMatch  = (ptrn: string): boolean => {
// 		return minimatch(value, ptrn, {nocase: true});
// 	};

// 	if (typeof pattern === 'string') {
// 		return checkMatch(pattern);
// 	}

// 	return pattern.some(checkMatch);
// }

// let contentsMeta: ContentMetaEntry[] | undefined;

// export function findMetaForPath(filePath: string): ContentMeta | undefined {
// 	if (!contentsMeta) {
// 		let confPath = getArgv().meta;
// 		if (confPath === '') {
// 			contentsMeta = [];
// 			return;
// 		}

// 		if (!path.isAbsolute(confPath)) {
// 			confPath = path.join(process.cwd(), confPath);
// 		}

// 		if (!fs.existsSync(confPath)) {
// 			throw new Error(`Not exists: (${confPath})`);
// 		}

// 		const content = fs.readFileSync(confPath, {encoding: 'utf8'}) ;
// 		contentsMeta = JSON.parse(content) as unknown as ContentMetaEntry[];
// 	}

// 	return contentsMeta.find((desc: ContentMetaEntry): boolean => {
// 		return globMatch(filePath, desc.glob);
// 	});
// }
