/**
 * SPDX-FileCopyrightText: (c) 2000 Liferay, Inc. https://liferay.com
 * SPDX-License-Identifier: LGPL-2.1-or-later OR LicenseRef-Liferay-DXP-EULA-2.0.0-2023-06
 */

const baseAttributes = [
	'accountExternalReferenceCode',
	'accountId',
	'analyticsCloudURL',
	'cloudConsoleURL',
	'contactSupportURL',
	'endUserLicenseAgreement',
	'eulaBaseURL',
	'featureFlags',
	'featurePreview',
	'marketoFormIdDefault',
	'marketoFormIdLiferayProduct',
	'productId',
	'publisherLicenseAgreement',
	'ssaProjectPrefix',
	'trialAccountCheck',
	'trialSSAHostPrefix',
	'useSiteTaxonomyVocabularyQuery',
] as const;

const baseKPIAttributes = [
	'kpiConnectorQuartelyRelease',
	'kpiLowCodePublishedApps',
	'kpiPartnershipIntegration',
	'kpiProjectUsingMarketplaceApps',
	'kpiQuartelyReleaseApps',
] as const;

function getAttribute<T extends readonly string[]>(
	attributes: T,
	element: HTMLElement
): Record<T[number], string> {
	return Object.fromEntries(
		attributes.map((attribute) => [
			attribute,
			element.getAttribute(attribute) ?? '',
		])
	) as Record<T[number], string>;
}

function parseArray(element: string | null) {
	return (element ?? '')
		.split(',')
		.map((item) => item.trim())
		.filter(Boolean);
}

export function getAttributes(element: HTMLElement) {
	return {
		...getAttribute(baseAttributes, element),
		featureFlags: parseArray(element.getAttribute('featureFlags')),
		featurePreview: parseArray(element.getAttribute('featurePreview')),
		kpi: getAttribute(baseKPIAttributes, element),
		useSiteTaxonomyVocabularyQuery:
			element.getAttribute('useSiteTaxonomyVocabularyQuery') === 'true',
	};
}

export type MarketplaceProperties = ReturnType<typeof getAttributes>;
