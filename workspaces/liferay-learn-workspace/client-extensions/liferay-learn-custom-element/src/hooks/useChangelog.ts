/**
 * SPDX-FileCopyrightText: (c) 2026 Liferay, Inc. https://liferay.com
 * SPDX-License-Identifier: LGPL-2.1-or-later OR LicenseRef-Liferay-DXP-EULA-2.0.0-2023-06
 */

import {useEffect, useState} from 'react';
import {
	IChangelog,
	IChangelogParams,
	getChangelog,
} from '~/services/rest/releaseNotes';

const useChangelog = ({
	components,
	from,
	keywords,
	page,
	pageSize,
	to,
}: IChangelogParams) => {
	const [changelog, setChangelog] = useState<IChangelog | undefined>(
		undefined
	);
	const [error, setError] = useState<Error | undefined>(undefined);
	const [loading, setLoading] = useState(true);

	const componentsKey = components.join('\n');

	useEffect(() => {
		let ignore = false;

		const fetchChangelog = async () => {
			setLoading(true);

			try {
				const response = await getChangelog({
					components: componentsKey ? componentsKey.split('\n') : [],
					from,
					keywords,
					page,
					pageSize,
					to,
				});

				if (!ignore) {
					setChangelog(response);
					setError(undefined);
				}
			}
			catch (error) {
				console.error('Error fetching changelog:', error);

				if (!ignore) {
					setChangelog(undefined);
					setError(error as Error);
				}
			}

			if (!ignore) {
				setLoading(false);
			}
		};

		fetchChangelog();

		return () => {
			ignore = true;
		};
	}, [componentsKey, from, keywords, page, pageSize, to]);

	return {changelog, error, loading};
};

export default useChangelog;
