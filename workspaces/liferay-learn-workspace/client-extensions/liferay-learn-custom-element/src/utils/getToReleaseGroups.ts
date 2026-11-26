/**
 * SPDX-FileCopyrightText: (c) 2026 Liferay, Inc. https://liferay.com
 * SPDX-License-Identifier: LGPL-2.1-or-later OR LicenseRef-Liferay-DXP-EULA-2.0.0-2023-06
 */

import {ProductVersion, Release} from '~/services/rest/releaseNotes';

export type ReleaseGroup = {
	key: string;
	name: string;
	releases: Release[];
};

const PRODUCT_VERSION_KEY_7_4 = '7.4';

export default function getToReleaseGroups(
	from: string,
	productVersions: ProductVersion[],
	productVersionKey: string
): ReleaseGroup[] {
	const index = productVersions.findIndex(
		(productVersion) => productVersion.key === productVersionKey
	);

	if (index < 0 || !from) {
		return [];
	}

	const productVersion = productVersions[index];

	const releaseIndex = productVersion.releases.findIndex(
		(release) => release.key === from
	);

	if (releaseIndex < 0) {
		return [];
	}

	const laterProductVersions = productVersions.slice(index + 1);

	const laterProductVersion = laterProductVersions.filter(
		(laterProductVersion) =>
			laterProductVersion.line === productVersion.line
	);

	const laterReleaseGroups = laterProductVersion.map(
		({key, name, releases}) => ({key, name, releases})
	);

	if (productVersion.key === PRODUCT_VERSION_KEY_7_4) {
		return laterReleaseGroups;
	}

	return [
		{
			key: productVersion.key,
			name: productVersion.name,
			releases: productVersion.releases.slice(releaseIndex),
		},
		...laterReleaseGroups,
	];
}
