/**
 * SPDX-FileCopyrightText: (c) 2026 Liferay, Inc. https://liferay.com
 * SPDX-License-Identifier: LGPL-2.1-or-later OR LicenseRef-Liferay-DXP-EULA-2.0.0-2023-06
 */

import {ClayPaginationBarWithBasicItems} from '@clayui/pagination-bar';

import {paginationLabels} from '../../../../utils/constants/paginationOptions';

type PaginationProps = {
	active: number;
	onActiveChange: (page: number) => void;
	pageSize: number;
	totalItems: number;
};

const Pagination = ({
	active,
	onActiveChange,
	pageSize,
	totalItems,
}: PaginationProps) => (
	<ClayPaginationBarWithBasicItems
		active={active}
		activeDelta={pageSize}
		deltas={[{label: pageSize}]}
		labels={paginationLabels}
		onActiveChange={onActiveChange}
		showDeltasDropDown={false}
		totalItems={totalItems}
	/>
);

export default Pagination;
