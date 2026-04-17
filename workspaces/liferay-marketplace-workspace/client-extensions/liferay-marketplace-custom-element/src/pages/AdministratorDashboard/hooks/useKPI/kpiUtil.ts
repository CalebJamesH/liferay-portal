/**
 * SPDX-FileCopyrightText: (c) 2000 Liferay, Inc. https://liferay.com
 * SPDX-License-Identifier: LGPL-2.1-or-later OR LicenseRef-Liferay-DXP-EULA-2.0.0-2023-06
 */

export const getAnnualTargetValues = (
	currentYearValue: number,
	kpiTarget: string,
	lastYearValue: number
) => {
	if (kpiTarget.includes('/')) {
		const [current, total] = kpiTarget.split('/');

		return {
			annualTargetCurrent: Number(current),
			annualTargetTotal: Number(total),
			lastYearValue: Number(lastYearValue),
		};
	}

	return {
		annualTargetCurrent: Number(currentYearValue),
		annualTargetTotal: Number(kpiTarget),
		lastYearValue: Number(lastYearValue),
	};
};

export const groupCatalogs = (catalogs: Catalog[], products: Product[]) => {
	return Object.groupBy(
		products?.map((product) => ({
			...product,
			catalogName:
				catalogs.find(
					(catalog) =>
						catalog?.externalReferenceCode ===
						product?.catalogExternalReferenceCode
				)?.name ?? product.externalReferenceCode,
		})),
		({catalogName}) => catalogName
	);
};