/**
 * SPDX-FileCopyrightText: (c) 2026 Liferay, Inc. https://liferay.com
 * SPDX-License-Identifier: LGPL-2.1-or-later OR LicenseRef-Liferay-DXP-EULA-2.0.0-2023-06
 */

import {useEffect, useState} from 'react';
import {
	HighlightsResponse,
	HighlightsParams,
	getHighlights,
} from '~/services/rest/releaseNotes';

const useHighlights = ({from, to}: HighlightsParams) => {
	const [error, setError] = useState<Error | undefined>(undefined);
	const [highlights, setHighlights] = useState<HighlightsResponse | undefined>(
		undefined
	);
	const [loading, setLoading] = useState(true);

	useEffect(() => {
		let ignore = false;

		const fetchHighlights = async () => {
			setLoading(true);

			try {
				const response = await getHighlights({from, to});

				if (!ignore) {
					setError(undefined);
					setHighlights(response);
				}
			}
			catch (error) {
				console.error('Error fetching highlights:', error);

				if (!ignore) {
					setError(error as Error);
					setHighlights(undefined);
				}
			}

			if (!ignore) {
				setLoading(false);
			}
		};

		fetchHighlights();

		return () => {
			ignore = true;
		};
	}, [from, to]);

	return {error, highlights, loading};
};

export default useHighlights;
