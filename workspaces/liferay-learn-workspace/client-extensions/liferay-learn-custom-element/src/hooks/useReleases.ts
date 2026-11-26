/**
 * SPDX-FileCopyrightText: (c) 2026 Liferay, Inc. https://liferay.com
 * SPDX-License-Identifier: LGPL-2.1-or-later OR LicenseRef-Liferay-DXP-EULA-2.0.0-2023-06
 */

import {useCallback, useEffect, useState} from 'react';
import {Liferay} from '~/services/liferay';
import {
	IProductVersion,
	ReleaseNotesError,
	getReleases,
} from '~/services/rest/releaseNotes';

const useReleases = () => {
	const [error, setError] = useState<Error | undefined>(undefined);
	const [loading, setLoading] = useState(true);
	const [productVersions, setProductVersions] = useState<IProductVersion[]>(
		[]
	);

	const fetchReleases = useCallback(async () => {
		setLoading(true);

		if (Liferay.ThemeDisplay.isSignedIn?.() === false) {
			setError(new ReleaseNotesError(401, 'Unauthorized'));
			setLoading(false);

			return;
		}

		try {
			const response = await getReleases();

			setError(undefined);
			setProductVersions(response);
		}
		catch (error) {
			console.error('Error fetching releases:', error);

			setError(error as Error);
			setProductVersions([]);
		}

		setLoading(false);
	}, []);

	useEffect(() => {
		fetchReleases();
	}, [fetchReleases]);

	return {error, loading, productVersions};
};

export default useReleases;
