/**
 * SPDX-FileCopyrightText: (c) 2026 Liferay, Inc. https://liferay.com
 * SPDX-License-Identifier: LGPL-2.1-or-later OR LicenseRef-Liferay-DXP-EULA-2.0.0-2023-06
 */

import {Liferay} from '~/services/liferay';

const OAUTH2_APP = 'liferay-learn-etc-spring-boot-oaua';
const BASE_PATH = '/release-notes';

export type ChangelogResponse = {
	items: ChangelogIssue[];
	total: number;
};

export type ChangelogIssue = {
	components: string[];
	description: string;
	key: string;
	releases: string[];
	summary: string;
	url: string;
};

export type ChangelogParams = {
	components: string[];
	from: string;
	keywords: string;
	page: number;
	pageSize: number;
	to: string;
};

export type Highlight = {
	importantChanges?: string;
	keyHighlights?: string;
	knownIssues?: string;
	releaseDate?: string;
	releaseKey: string;
	security?: string;
	title: string;
};

export type HighlightsResponse = {
	hasQuarterlyReleases: boolean;
	items: Highlight[];
	total: number;
};

export type HighlightsParams = {
	from: string;
	to: string;
};

export type ModuleChange = {
	fromURL?: string;
	fromVersion?: string;
	group: string;
	name: string;
	owner: string;
	toURL?: string;
	toVersion?: string;
};

export type ModuleChangesResponse = {
	items: ModuleChange[];
	total: number;
};

export type ModuleChangesParams = {
	changesOnly: boolean;
	from: string;
	keywords: string;
	owners: string[];
	to: string;
};

export type Release = {
	key: string;
	name: string;
};

export type ProductVersion = {
	key: string;
	line: string;
	name: string;
	releases: Release[];
};

export class ReleaseNotesError extends Error {
	status: number;

	constructor(status: number, message: string) {
		super(message);

		this.status = status;
	}
}

async function fetch<T = any>(path: string): Promise<T> {
	const oauth2Client =
		Liferay.OAuth2Client.FromUserAgentApplication(OAUTH2_APP);

	const response = await oauth2Client.fetch(`${BASE_PATH}${path}`);

	if (!response.ok) {
		throw new ReleaseNotesError(
			response.status,
			`Release notes API error: ${response.statusText}`
		);
	}

	return response.json();
}

export async function getChangelog({
	components,
	from,
	keywords,
	page,
	pageSize,
	to,
}: ChangelogParams): Promise<ChangelogResponse> {
	const searchParams = new URLSearchParams({
		from,
		keywords,
		page: String(page),
		pageSize: String(pageSize),
		to,
	});

	components.forEach((component) =>
		searchParams.append('components', component)
	);

	return fetch(`/changelog?${searchParams.toString()}`);
}

export async function getChangelogComponents(): Promise<string[]> {
	return fetch('/changelog/components');
}

export async function getHighlights({
	from,
	to,
}: HighlightsParams): Promise<HighlightsResponse> {
	const searchParams = new URLSearchParams({from, to});

	return fetch(`/highlights?${searchParams.toString()}`);
}

export async function getModuleChanges({
	changesOnly,
	from,
	keywords,
	owners,
	to,
}: ModuleChangesParams): Promise<ModuleChangesResponse> {
	const searchParams = new URLSearchParams({
		changesOnly: String(changesOnly),
		from,
		keywords,
		to,
	});

	owners.forEach((owner) => searchParams.append('owners', owner));

	return fetch(`/module-changes?${searchParams.toString()}`);
}

export async function getReleases(): Promise<ProductVersion[]> {
	return fetch('/releases');
}
