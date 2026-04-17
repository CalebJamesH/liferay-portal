/**
 * SPDX-FileCopyrightText: (c) 2000 Liferay, Inc. https://liferay.com
 * SPDX-License-Identifier: LGPL-2.1-or-later OR LicenseRef-Liferay-DXP-EULA-2.0.0-2023-06
 */

import SearchBuilder from "../../../../core/SearchBuilder";
import HeadlessCommerceAdminCatalog from "../../../../services/rest/HeadlessCommerceAdminCatalog";
import GraphQL from "../../../../services/rest/HeadlessGraphQL";
import { appsQReleaseFilters, lowCodeAppsPublishedFilters, partnershipsFilters } from './kpiFilters';

export type KPIQueries = typeof kpiQueries;

export const kpiQueries = [
	HeadlessCommerceAdminCatalog.getProductsDashboardKPI(
		{
			appsQReleaseCurrentYear: appsQReleaseFilters.currentYear,
			appsQReleaseLastYear: appsQReleaseFilters.lastYear,
			lowCodeAppsPublishedCurrentYear:
				lowCodeAppsPublishedFilters.currentYear,
			lowCodeAppsPublishedLastYear: lowCodeAppsPublishedFilters.lastYear,
			partnershipsCurrentYear: partnershipsFilters.currentYear,
			partnershipsLastYear: partnershipsFilters.lastYear,
		},
		{
			appsQReleaseCurrentYear: {
				body: ` items { catalogExternalReferenceCode, id, name, thumbnail } `,
				pageSize: -1,
			},
			appsQReleaseLastYear: {
				body: ` items { catalogExternalReferenceCode, id, name, thumbnail } `,
				pageSize: -1,
			},
		}
	),
	HeadlessCommerceAdminCatalog.getCatalogs(
		new URLSearchParams({
			fields: 'externalReferenceCode,name',
			pageSize: '-1',
		})
	),
	GraphQL.metrics<{name: string; value: string}>(
		{
			group: 'c',
			name: 'reports',
			options: {
				body: `items { name, value }`,
				sort: 'dateCreated:desc',
			},
		},
		{
			projectsUsingMarketplace: SearchBuilder.eq(
				'name',
				'projectsUsingMarketplace'
			),
		}
	),
] as const;