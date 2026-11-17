/**
 * SPDX-FileCopyrightText: (c) 2000 Liferay, Inc. https://liferay.com
 * SPDX-License-Identifier: LGPL-2.1-or-later OR LicenseRef-Liferay-DXP-EULA-2.0.0-2023-06
 */

import {JiraEnum} from './JiraEnum';

export type SortOption = {
	[JiraEnum.SORT_BY]: string;
	[JiraEnum.SORT_ORDER]: 'asc' | 'desc';
	key: string;
};

export type SortOptions = {
	sorts: SortOption[];
};

export const SORT_OPTIONS: SortOptions = {
	sorts: [
		{
			[JiraEnum.SORT_BY]: JiraEnum.PUBLISHED_DATE,
			[JiraEnum.SORT_ORDER]: 'desc',
			key: 'newest',
		},
		{
			[JiraEnum.SORT_BY]: JiraEnum.PUBLISHED_DATE,
			[JiraEnum.SORT_ORDER]: 'asc',
			key: 'oldest',
		},
	],
};
