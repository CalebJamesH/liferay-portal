/**
 * SPDX-FileCopyrightText: (c) 2026 Liferay, Inc. https://liferay.com
 * SPDX-License-Identifier: LGPL-2.1-or-later OR LicenseRef-Liferay-DXP-EULA-2.0.0-2023-06
 */

import {useEffect, useState} from 'react';
import {getChangelogComponents} from '~/services/rest/releaseNotes';

const useChangelogComponents = () => {
	const [components, setComponents] = useState<string[]>([]);
	const [error, setError] = useState<Error | undefined>(undefined);

	useEffect(() => {
		let ignore = false;

		getChangelogComponents()
			.then((response) => {
				if (!ignore) {
					setComponents(response);
				}
			})
			.catch((error) => {
				console.error('Error fetching changelog components:', error);

				if (!ignore) {
					setError(error as Error);
				}
			});

		return () => {
			ignore = true;
		};
	}, []);

	return {components, error};
};

export default useChangelogComponents;
