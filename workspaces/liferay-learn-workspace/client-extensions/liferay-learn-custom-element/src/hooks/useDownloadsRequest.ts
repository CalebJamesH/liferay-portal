/**
 * SPDX-FileCopyrightText: (c) 2026 Liferay, Inc. https://liferay.com
 * SPDX-License-Identifier: LGPL-2.1-or-later OR LicenseRef-Liferay-DXP-EULA-2.0.0-2023-06
 */

import {useEffect, useState} from 'react';

const useDownloadsRequest = <T>(request: (() => Promise<T>) | null) => {
	const [data, setData] = useState<T | undefined>(undefined);
	const [error, setError] = useState<Error | undefined>(undefined);
	const [loading, setLoading] = useState(Boolean(request));

	useEffect(() => {
		if (!request) {
			setData(undefined);
			setError(undefined);
			setLoading(false);

			return;
		}

		let active = true;

		setLoading(true);

		request()
			.then((response) => {
				if (active) {
					setData(response);
					setError(undefined);
				}
			})
			.catch((error) => {
				console.error('Error fetching downloads:', error);

				if (active) {
					setData(undefined);
					setError(error as Error);
				}
			})
			.finally(() => {
				if (active) {
					setLoading(false);
				}
			});

		return () => {
			active = false;
		};
	}, [request]);

	return {data, error, loading, setData};
};

export default useDownloadsRequest;
