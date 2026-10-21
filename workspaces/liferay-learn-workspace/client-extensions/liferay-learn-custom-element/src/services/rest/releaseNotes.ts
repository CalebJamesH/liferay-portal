/**
 * SPDX-FileCopyrightText: (c) 2026 Liferay, Inc. https://liferay.com
 * SPDX-License-Identifier: LGPL-2.1-or-later OR LicenseRef-Liferay-DXP-EULA-2.0.0-2023-06
 */

import {Liferay} from '~/services/liferay';

const OAUTH2_APP = 'liferay-learn-etc-spring-boot-oaua';
const BASE_PATH = '/release-notes';

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

export async function getHighlights({
	from,
	to,
}: IHighlightsParams): Promise<IHighlights> {
	const searchParams = new URLSearchParams({from, to});

	return releaseNotesFetchJSON(`/highlights?${searchParams.toString()}`);
}

export async function getReleases(): Promise<IProductVersion[]> {
	return releaseNotesFetchJSON('/releases');
}
