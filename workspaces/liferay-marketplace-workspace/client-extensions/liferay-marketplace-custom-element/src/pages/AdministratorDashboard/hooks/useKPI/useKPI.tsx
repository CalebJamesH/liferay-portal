/**
 * SPDX-FileCopyrightText: (c) 2000 Liferay, Inc. https://liferay.com
 * SPDX-License-Identifier: LGPL-2.1-or-later OR LicenseRef-Liferay-DXP-EULA-2.0.0-2023-06
 */

import {ComponentProps} from 'react';
import {useNavigate} from 'react-router-dom';
import useSWR from 'swr';

import {useMarketplaceContext} from '../../../../context/MarketplaceContext';
import {AccountType} from '../../../../enums/Account';
import {ProductType} from '../../../../enums/Product';
import useListTypeDefinition from '../../../../hooks/useListTypeDefinition';
import useModalContext from '../../../../hooks/useModalContext';
import {safeJSONParse} from '../../../../utils/util';
import ProjectsUsingMarketplaceModalBody, {
	ProjectData,
} from '../../components/ProjectsUsingMarketplace';
import {kpiQueries} from './kpiQueries';
import {
	filterProjectsByYear,
	getAnnualTargetValues,
	groupCatalogs,
} from './kpiUtil';

const useKPI = () => {
	const modal = useModalContext();
	const navigate = useNavigate();
	const {
		properties: {kpi: annualTargetKPIs},
	} = useMarketplaceContext();

	const {data: liferayVersionsPicklist} =
		useListTypeDefinition('LIFERAY-VERSIONS');

	const liferayQuarterlyVersionEntries =
		liferayVersionsPicklist?.listTypeEntries.filter((entry) =>
			entry.externalReferenceCode.includes('Q')
		);

	const liferayQuarterlyVersionsAndConnectors = JSON.stringify({
		'specificationValues|liferayVersion':
			liferayQuarterlyVersionEntries?.map((entry) => entry.name),
	});

	const {
		kpiConnectorQuartelyRelease,
		kpiLowCodePublishedApps,
		kpiPartnershipIntegration,
		kpiProjectUsingMarketplaceApps,
		kpiQuartelyReleaseApps,
	} = annualTargetKPIs;

	return useSWR('metrics/kpi', async () => {
		const [marketplaceApps, catalogsResponse, projectsKPI] =
			await Promise.all(kpiQueries);

		const {
			appsQReleaseCurrentYear,
			appsQReleaseLastYear,
			lowCodeAppsPublishedCurrentYear,
			lowCodeAppsPublishedLastYear,
			partnershipsCurrentYear,
			partnershipsLastYear,
		} = marketplaceApps.data.metrics;

		const parsedProjects = safeJSONParse(
			projectsKPI?.data?.metrics?.projectsUsingMarketplace?.items?.[0]
				?.value,
			{}
		) as {[key: string]: ProjectData};

		const projectsUsingMarketplace = Object.entries(parsedProjects);

		const projectsUsingMarketplace2025 = filterProjectsByYear(
			projectsUsingMarketplace,
			2025
		);
		const projectsUsingMarketplace2026 = filterProjectsByYear(
			projectsUsingMarketplace,
			2026
		);

		const catalogProductsMapCurrentYear = groupCatalogs(
			catalogsResponse?.items,
			appsQReleaseCurrentYear?.items
		);
		const catalogProductsMapLastYear = groupCatalogs(
			catalogsResponse?.items,
			appsQReleaseLastYear?.items
		);

		return {
			kpis: [
				{
					...getAnnualTargetValues(
						projectsUsingMarketplace2026.length,
						kpiProjectUsingMarketplaceApps,
						projectsUsingMarketplace2025.length
					),
					colors: ['#9CE269', '#D4F3BE'],
					onClick: projectsUsingMarketplace.length
						? () =>
								modal.onOpenModal({
									body: (
										<ProjectsUsingMarketplaceModalBody
											projectsUsingMarkeplaceApps={
												projectsUsingMarketplace2026
											}
										/>
									),
									header: 'New Projects Using Marketplace Apps',
									size: 'lg',
								})
						: null,
					title: 'New Projects Using Marketplace Apps',
				},
				{
					onClick: () =>
						navigate(
							`/publishers?filter={"customFields/AccountType":["${AccountType.TECHNOLOGY_PARTNER}"]}&filterSchema=administratorPublishers`
						),
					...getAnnualTargetValues(
						partnershipsCurrentYear.totalCount,
						kpiPartnershipIntegration,
						partnershipsLastYear.totalCount
					),
					colors: ['#FFB46E', '#FFE9D4'],
					externalPage: true,
					title: 'Technology Partnership With Integrations',
				},
				{
					onClick: () =>
						modal.onOpenModal({
							body: (
								<ol>
									{Object.entries(
										catalogProductsMapCurrentYear
									).map(([catalog, products = []], index) => (
										<li key={index}>
											<span className="font-weight-bold">
												{catalog}
											</span>

											<ol>
												{products.map(({id, name}) => (
													<li key={id}>
														{name?.en_US}
													</li>
												))}
											</ol>
										</li>
									))}
								</ol>
							),
							header: `Publisher With Apps Supporting Quarterly Release (${Object.keys(catalogProductsMapCurrentYear).length})`,
						}),
					...getAnnualTargetValues(
						Object.keys(catalogProductsMapCurrentYear).length,
						kpiQuartelyReleaseApps,
						Object.keys(catalogProductsMapLastYear).length
					),
					colors: ['#4B9BFF', '#B1D4FF'],
					title: 'Publisher With Apps Supporting Quarterly Release',
				},
				{
					...getAnnualTargetValues(
						appsQReleaseLastYear.totalCount,
						kpiConnectorQuartelyRelease,
						appsQReleaseCurrentYear.totalCount
					),
					colors: ['#FF73C3', '#FFE1F0'],
					externalPage: true,
					onClick: () =>
						navigate(
							`/apps?filter=${liferayQuarterlyVersionsAndConnectors}&filterSchema=administratorApps`
						),
					title: 'Apps & Connectors Supporting Quarterly Release',
				},
				{
					...getAnnualTargetValues(
						lowCodeAppsPublishedLastYear.totalCount,
						kpiLowCodePublishedApps,
						lowCodeAppsPublishedCurrentYear.totalCount
					),
					colors: ['#FFD76E', '#FFF3D4'],
					externalPage: true,
					onClick: () =>
						navigate(
							`/apps?filter={"specificationValues|appType":"${ProductType.LOW_CODE_CONFIGURATION}"}&filterSchema=administratorApps`
						),
					title: 'Low Code Configurations Published',
				},
			],
			projectsKPI,
		};
	});
};

export default useKPI;
