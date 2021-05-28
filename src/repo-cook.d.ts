
declare interface PackageEntry {
	relPath: string;
	additionalContent: Record<string, string>;
}

declare interface RepositoryInfo {
	rootPath: string;
	packages: PackageEntry[];
}


declare interface LinuxRepoCook {
	additionalFileNames(fileName: string): Record<string, string> | undefined;
	makeRepository(repo: RepositoryInfo): Promise<void>;
}

