/**
 * 
 */
class YumRepoCook implements LinuxRepoCook {

	additionalFileNames(fileName: string): Record<string, string> | undefined {
		return {
			meta: `${fileName}.meta`
		};
	}

	makeRepository(repo: RepositoryInfo): Promise<void> {
		throw new Error('RPM Cook does not implented ... yet');
	}
}


/**
 * 
 */
export function createRpmRepoCook(): LinuxRepoCook {
	// throw new Error('RPM Cook does not implented ... yet');
	return new YumRepoCook();
}