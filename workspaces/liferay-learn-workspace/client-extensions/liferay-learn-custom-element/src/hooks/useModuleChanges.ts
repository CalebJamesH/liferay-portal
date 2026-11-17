/**
 * SPDX-FileCopyrightText: (c) 2026 Liferay, Inc. https://liferay.com
 * SPDX-License-Identifier: LGPL-2.1-or-later OR LicenseRef-Liferay-DXP-EULA-2.0.0-2023-06
 */

import {useEffect, useState} from 'react';
import {
	ModuleChangesResponse,
	ModuleChangesParams,
	getModuleChanges,
} from '~/services/rest/releaseNotes';

const useModuleChanges = ({
	changesOnly,
	from,
	keywords,
	owners,
	to,
}: ModuleChangesParams) => {
	const [error, setError] = useState<Error | undefined>(undefined);
	const [loading, setLoading] = useState(true);
	const [moduleChanges, setModuleChanges] = useState<
		ModuleChangesResponse | undefined
	>(undefined);

	const ownersKey = owners.join(',');

	useEffect(() => {
		let ignore = false;

		const fetchModuleChanges = async () => {
			setLoading(true);

			try {
				const response = await getModuleChanges({
					changesOnly,
					from,
					keywords,
					owners: ownersKey ? ownersKey.split(',') : [],
					to,
				});

				if (!ignore) {
					setError(undefined);
					setModuleChanges(response);
				}
			}
			catch (error) {
				console.error('Error fetching module changes:', error);

				if (!ignore) {
					setError(error as Error);
					setModuleChanges(undefined);
				}
			}

			if (!ignore) {
				setLoading(false);
			}
		};

		fetchModuleChanges();

		return () => {
			ignore = true;
		};
	}, [changesOnly, from, keywords, ownersKey, to]);

	return {error, loading, moduleChanges};
};

export default useModuleChanges;
