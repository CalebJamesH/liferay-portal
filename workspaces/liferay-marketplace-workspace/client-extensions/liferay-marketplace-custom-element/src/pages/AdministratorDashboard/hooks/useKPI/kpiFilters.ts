/**
 * SPDX-FileCopyrightText: (c) 2000 Liferay, Inc. https://liferay.com
 * SPDX-License-Identifier: LGPL-2.1-or-later OR LicenseRef-Liferay-DXP-EULA-2.0.0-2023-06
 */

import SearchBuilder from "../../../../core/SearchBuilder";
import { AccountType } from "../../../../enums/Account";
import { ProductType, ProductWorkflowStatusCode } from "../../../../enums/Product";

const buildYearFilter = (
    searchBuilder: SearchBuilder,
    year: number,
) => {
    return searchBuilder
        .clone()
        .gt('createDate', `${year - 1}-12-31T23:59:59.999Z`)
        .and()
        .lt('createDate', `${year + 1}-01-01T00:00:00.000Z`)
        .build();
};

const buildCurrentAndLastYearFilters = (
    searchBuilder: SearchBuilder,
) => {
    const currentYear = new Date().getFullYear();

    return {
        currentYear: buildYearFilter(searchBuilder, currentYear),
        lastYear: buildYearFilter(
            searchBuilder,
            currentYear - 1,
        ),
    };
};

const baseSearchBuilder = new SearchBuilder()
    .in('statusCode', [ProductWorkflowStatusCode.APPROVED])
    .and();

const appsQReleaseSearchBuilder = baseSearchBuilder
    .clone()
    .group('OPEN')
    .lambdaContains('specificationValues', '2026 Q')
    .or()
    .lambdaContains('specificationValues', '2025 Q')
    .or()
    .lambdaContains('specificationValues', '2024 Q')
    .or()
    .lambdaContains('specificationValues', '2023 Q')
    .group('CLOSE')
    .and()
    .not()
    .lambda('specificationValues', ProductType.LOW_CODE_CONFIGURATION)
    .and();

const lowCodeAppsPublishedSearchBuilder = baseSearchBuilder
    .clone()
    .lambda('specificationValues', ProductType.LOW_CODE_CONFIGURATION)
    .and();

const partnershipsSearchBuilder = new SearchBuilder()
    .lambda('specificationValues', AccountType.TECHNOLOGY_PARTNER)
    .and();

export const appsQReleaseFilters = buildCurrentAndLastYearFilters(
    appsQReleaseSearchBuilder
);
export const lowCodeAppsPublishedFilters = buildCurrentAndLastYearFilters(
    lowCodeAppsPublishedSearchBuilder
);
export const partnershipsFilters = buildCurrentAndLastYearFilters(
    partnershipsSearchBuilder
);
