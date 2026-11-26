/**
 * SPDX-FileCopyrightText: (c) 2000 Liferay, Inc. https://liferay.com
 * SPDX-License-Identifier: LGPL-2.1-or-later OR LicenseRef-Liferay-DXP-EULA-2.0.0-2023-06
 */

import {useCallback, useEffect, useState} from 'react';
import {useSearchParams} from 'react-router-dom';
import {searchSecurityVulnerabilities} from '~/services/rest/jira';
import {JiraEnum} from '~/utils/constants/JiraEnum';
import {FILTER_MAP, FilterOptions} from '~/utils/constants/filterOptions';

import {JiraIssue} from './useJiraIssue';

export type JiraResponse = {
	[JiraEnum.ISSUES]?: JiraIssue[];
	[JiraEnum.KEYWORDS]?: string;
	[JiraEnum.PAGE]?: number;
	[JiraEnum.PAGE_SIZE]?: number;
	[JiraEnum.SORT_BY]?: string;
	[JiraEnum.SORT_ORDER]?: string;
	[JiraEnum.TOTAL]?: number;
};

export type JiraSearchParams = {
	[JiraEnum.FILTERS]?: FilterOptions;
	[JiraEnum.KEYWORDS]?: string;
	[JiraEnum.PAGE]?: number;
	[JiraEnum.PAGE_SIZE]?: number;
	[JiraEnum.SORT_BY]?: string;
	[JiraEnum.SORT_ORDER]?: string;
};

const NUMBER_KEYS = [JiraEnum.PAGE, JiraEnum.PAGE_SIZE] as const;

const STRING_KEYS = [
	JiraEnum.KEYWORDS,
	JiraEnum.SORT_BY,
	JiraEnum.SORT_ORDER,
] as const;

const getPositiveInteger = (value: string | null) => {
	const number = Number(value);

	if (Number.isInteger(number) && number > 0) {
		return number;
	}

	return undefined;
};

const setOrDelete = (
	key: string,
	urlSearchParams: URLSearchParams,
	value?: string
) => {
	if (value) {
		urlSearchParams.set(key, value);
	}
	else {
		urlSearchParams.delete(key);
	}
};

const mergeIntoURL = (
	defaultParams: JiraSearchParams,
	params: JiraSearchParams,
	urlSearchParams: URLSearchParams
): URLSearchParams => {
	const newURLSearchParams = new URLSearchParams(urlSearchParams);

	for (const key of [...NUMBER_KEYS, ...STRING_KEYS]) {
		if (!(key in params)) {
			continue;
		}

		const value = params[key];

		setOrDelete(
			key,
			newURLSearchParams,
			value === defaultParams[key] ? undefined : value?.toString()
		);
	}

	const filters = params[JiraEnum.FILTERS] ?? {};

	for (const [key, values] of Object.entries(filters)) {
		setOrDelete(key, newURLSearchParams, values?.join(','));
	}

	return newURLSearchParams;
};

const toAPIQueryString = (
	urlSearchParams: URLSearchParams,
	defaultParams: JiraSearchParams
): string => {
	const apiSearchParams = new URLSearchParams();

	for (const key of NUMBER_KEYS) {
		const value =
			getPositiveInteger(urlSearchParams.get(key)) ?? defaultParams[key];

		setOrDelete(key, apiSearchParams, value?.toString());
	}

	for (const key of STRING_KEYS) {
		setOrDelete(
			key,
			apiSearchParams,
			urlSearchParams.get(key) || defaultParams[key]
		);
	}

	for (const [key, apiKey] of Object.entries(FILTER_MAP)) {
		setOrDelete(
			apiKey,
			apiSearchParams,
			urlSearchParams.get(key) ?? undefined
		);
	}

	return apiSearchParams.toString();
};

const useJiraSearch = (defaultParams: JiraSearchParams) => {
	const [error, setError] = useState(false);
	const [jiraSearch, setJiraSearch] = useState<JiraResponse>();
	const [loading, setLoading] = useState(true);
	const [searchParams, setSearchParams] = useSearchParams();

	useEffect(() => {
		let stale = false;

		const fetchJiraSearch = async () => {
			setError(false);
			setLoading(true);

			try {
				const response: JiraResponse =
					await searchSecurityVulnerabilities(
						toAPIQueryString(searchParams, defaultParams)
					);

				if (stale) {
					return;
				}

				setJiraSearch(response);
			}
			catch (error) {
				console.error('Error fetching Jira data:', error);

				if (!stale) {
					setError(true);
				}
			}

			if (!stale) {
				setLoading(false);
			}
		};

		fetchJiraSearch();

		return () => {
			stale = true;
		};
	}, [defaultParams, searchParams]);

	const updateSearchParams = useCallback(
		(params: JiraSearchParams) => {
			setSearchParams((urlSearchParams) => {
				return mergeIntoURL(defaultParams, params, urlSearchParams);
			});
		},
		[defaultParams, setSearchParams]
	);

	return {error, jiraSearch, loading, searchParams, updateSearchParams};
};

export default useJiraSearch;
