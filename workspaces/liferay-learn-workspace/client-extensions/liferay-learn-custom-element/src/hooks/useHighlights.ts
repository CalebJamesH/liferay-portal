/**
 * SPDX-FileCopyrightText: (c) 2026 Liferay, Inc. https://liferay.com
 * SPDX-License-Identifier: LGPL-2.1-or-later OR LicenseRef-Liferay-DXP-EULA-2.0.0-2023-06
 */

import {useEffect, useState} from 'react';
import {
	IHighlights,
	IHighlightsParams,
	getHighlights,
} from '~/services/rest/releaseNotes';

const useHighlights = ({from, to}: IHighlightsParams) => {
	const [error, setError] = useState<Error | undefined>(undefined);
	const [highlights, setHighlights] = useState<IHighlights | undefined>(
		undefined
	);
	const [loading, setLoading] = useState(true);

	useEffect(() => {
		let ignore = false;

		setLoading(true);

		getHighlights({from, to})
			.then((response) => {
				if (!ignore) {
					setError(undefined);
					setHighlights(response);
				}
			})
			.catch((error) => {
				console.error('Error fetching highlights:', error);

				if (!ignore) {
					setError(error as Error);
					setHighlights(undefined);
				}
			})
			.finally(() => {
				if (!ignore) {
					setLoading(false);
				}
			});

		return () => {
			ignore = true;
		};
	}, [from, to]);

	return {error, highlights, loading};
};

export default useHighlights;
