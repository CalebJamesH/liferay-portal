/**
 * SPDX-FileCopyrightText: (c) 2026 Liferay, Inc. https://liferay.com
 * SPDX-License-Identifier: LGPL-2.1-or-later OR LicenseRef-Liferay-DXP-EULA-2.0.0-2023-06
 */

import {Liferay} from '~/services/liferay';

const BASE_PATH = '/downloads';
const OAUTH2_APP = 'liferay-learn-etc-spring-boot-oaua';

export type AgreementType = 'esa' | 'evaluationEula' | 'studioEula';

export type Agreement = {
	accepted: boolean;
	hasContent: boolean;
	version: string;
};

export type Agreements = Record<AgreementType, Agreement>;

export type Download = {
	additionalNotes: string;
	alertMessage: string;
	downloadNumber: number;
	fileGroups: DownloadFileGroup[];
	fileTypes: string[];
	id: number;
	links: DownloadLink[];
	product: string;
	releaseDate: string;
	releaseKey: string;
	requiredAgreement: AgreementType | '';
	title: string;
	urlTitle: string;
};

export type DownloadFile = {
	id: number;
	md5: string;
	name: string;
	otherDetails: string;
	sha1: string;
	sha512: string;
	size: string;
	url: string;
};

export type DownloadFileGroup = {
	files: DownloadFile[];
	name: string;
};

export type DownloadFileType = {
	key: string;
	name: string;
};

export type DownloadLink = {
	label: string;
	url: string;
};

export type DownloadProduct = {
	fileTypes: DownloadFileType[];
	key: string;
	logo?: string;
	name: string;
};

export type Downloads = {
	items: Download[];
	page: number;
	pageSize: number;
	totalCount: number;
};

export type DownloadsParams = {
	fileType: string;
	page: number;
	pageSize: number;
	product: string;
};

export class DownloadsError extends Error {
	status: number;
	subscriptionURL: string;

	constructor(status: number, message: string, subscriptionURL = '') {
		super(message);

		this.status = status;
		this.subscriptionURL = subscriptionURL;
	}
}

async function getSubscriptionURL(response: Response): Promise<string> {
	try {
		const {subscriptionURL} = await response.json();

		return typeof subscriptionURL === 'string' ? subscriptionURL : '';
	}
	catch {
		return '';
	}
}

async function fetch<T = any>(path: string, init?: RequestInit): Promise<T> {
	const oauth2Client =
		Liferay.OAuth2Client.FromUserAgentApplication(OAUTH2_APP);

	const response = await oauth2Client.fetch(`${BASE_PATH}${path}`, init);

	if (!response.ok) {
		throw new DownloadsError(
			response.status,
			`Downloads API error: ${response.statusText}`,
			response.status === 403 ? await getSubscriptionURL(response) : ''
		);
	}

	return response.json();
}

export async function acceptAgreement(
	agreementType: AgreementType
): Promise<Agreements> {
	return fetch(`/agreements/${agreementType}`, {method: 'POST'});
}

export async function getAgreementContent(
	agreementType: AgreementType
): Promise<string> {
	const {content} = await fetch<{content: string}>(
		`/agreements/${agreementType}/content`
	);

	return content;
}

export async function getAgreements(): Promise<Agreements> {
	return fetch('/agreements');
}

export async function getDownload(urlTitle: string): Promise<Download> {
	return fetch(`/${encodeURIComponent(urlTitle)}`);
}

export async function getDownloadProducts(): Promise<DownloadProduct[]> {
	return fetch('/products');
}

export async function getDownloads({
	fileType,
	page,
	pageSize,
	product,
}: DownloadsParams): Promise<Downloads> {
	const searchParams = new URLSearchParams({
		fileType,
		page: String(page),
		pageSize: String(pageSize),
		product,
	});

	return fetch(`?${searchParams.toString()}`);
}
