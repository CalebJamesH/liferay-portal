/**
 * SPDX-FileCopyrightText: (c) 2026 Liferay, Inc. https://liferay.com
 * SPDX-License-Identifier: LGPL-2.1-or-later OR LicenseRef-Liferay-DXP-EULA-2.0.0-2023-06
 */

import {Liferay} from '~/services/liferay';

const OAUTH2_APP = 'liferay-learn-etc-spring-boot-oaua';
const BASE_PATH = '/release-notes';

export interface IChangelog {
	items: IChangelogIssue[];
	total: number;
}

export interface IChangelogIssue {
	components: string[];
	description: string;
	key: string;
	releases: string[];
	summary: string;
	url: string;
}

export interface IChangelogParams {
	components: string[];
	from: string;
	keywords: string;
	page: number;
	pageSize: number;
	to: string;
}

export interface IHighlight {
	importantChanges?: string;
	keyHighlights?: string;
	knownIssues?: string;
	releaseDate?: string;
	releaseKey: string;
	security?: string;
	title: string;
}

export interface IHighlights {
	hasQuarterlyReleases: boolean;
	items: IHighlight[];
	total: number;
}

export interface IHighlightsParams {
	from: string;
	to: string;
}

export interface IModuleChange {
	fromURL?: string;
	fromVersion?: string;
	group: string;
	name: string;
	owner: string;
	toURL?: string;
	toVersion?: string;
}

export interface IModuleChanges {
	items: IModuleChange[];
	total: number;
}

export interface IModuleChangesParams {
	changesOnly: boolean;
	from: string;
	keywords: string;
	owners: string[];
	to: string;
}

export interface IRelease {
	key: string;
	name: string;
}

export interface IProductVersion {
	key: string;
	line: string;
	name: string;
	releases: IRelease[];
}

export class ReleaseNotesError extends Error {
	status: number;

	constructor(status: number, message: string) {
		super(message);

		this.status = status;
	}
}

async function releaseNotesFetchJSON<T = any>(path: string): Promise<T> {
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
}: IChangelogParams): Promise<IChangelog> {
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

	return releaseNotesFetchJSON(`/changelog?${searchParams.toString()}`);
}

export async function getChangelogComponents(): Promise<string[]> {
	return releaseNotesFetchJSON('/changelog/components');
}

export async function getHighlights({
	from,
	to,
}: IHighlightsParams): Promise<IHighlights> {
	const searchParams = new URLSearchParams({from, to});

	return releaseNotesFetchJSON(`/highlights?${searchParams.toString()}`);
}

export async function getModuleChanges({
	changesOnly,
	from,
	keywords,
	owners,
	to,
}: IModuleChangesParams): Promise<IModuleChanges> {
	const searchParams = new URLSearchParams({
		changesOnly: String(changesOnly),
		from,
		keywords,
		to,
	});

	owners.forEach((owner) => searchParams.append('owners', owner));

	return releaseNotesFetchJSON(`/module-changes?${searchParams.toString()}`);
}

export async function getReleases(): Promise<IProductVersion[]> {
	return releaseNotesFetchJSON('/releases');
}
