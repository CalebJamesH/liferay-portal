/**
 * SPDX-FileCopyrightText: (c) 2026 Liferay, Inc. https://liferay.com
 * SPDX-License-Identifier: LGPL-2.1-or-later OR LicenseRef-Liferay-DXP-EULA-2.0.0-2023-06
 */

import {ReactNode, useMemo} from 'react';
import {ProductVersion} from '~/services/rest/releaseNotes';

import getToReleaseGroups, {ReleaseGroup} from '~/utils/getToReleaseGroups';
import ReleaseAutocomplete from '../ReleaseAutocomplete/ReleaseAutocomplete';

import './ReleaseComparison.scss';

export type ReleaseRange = {
	from: string;
	productVersion: string;
	to: string;
};

type ReleaseComparisonProps = {
	onChange: (releaseRange: ReleaseRange) => void;
	productIcon?: ReactNode;
	productVersions: ProductVersion[];
	releaseRange: ReleaseRange;
};

const ReleaseComparison = ({
	onChange,
	productIcon,
	productVersions,
	releaseRange,
}: ReleaseComparisonProps) => {
	const productVersion = useMemo(
		() =>
			productVersions.find(
				(productVersion) =>
					productVersion.key === releaseRange.productVersion
			),
		[productVersions, releaseRange.productVersion]
	);

	const fromReleaseGroups = useMemo<ReleaseGroup[]>(() => {
		if (!productVersion) {
			return [];
		}

		return [
			{
				key: productVersion.key,
				name: productVersion.name,
				releases: productVersion.releases,
			},
		];
	}, [productVersion]);

	const productVersionGroups = useMemo<ReleaseGroup[]>(
		() => [
			{
				key: 'product-versions',
				name: '',
				releases: [...productVersions].reverse(),
			},
		],
		[productVersions]
	);

	const toReleaseGroups = useMemo(
		() =>
			getToReleaseGroups(
				releaseRange.from,
				productVersions,
				releaseRange.productVersion
			),
		[productVersions, releaseRange.from, releaseRange.productVersion]
	);

	const handleProductVersionChange = (value: string) => {
		const releases =
			productVersions.find(
				(productVersion) => productVersion.key === value
			)?.releases ?? [];

		const autopopulatedRelease =
			releases.length === 1 ? releases[0].key : '';

		onChange({
			from: autopopulatedRelease,
			productVersion: value,
			to: autopopulatedRelease,
		});
	};

	return (
		<div className="align-items-center bg-white d-flex release-comparison">
			<ReleaseAutocomplete
				icon={productIcon}
				id="releaseRangeProductVersion"
				label="product"
				onChange={handleProductVersionChange}
				placeholder="select-product"
				releaseGroups={productVersionGroups}
				value={releaseRange.productVersion}
			/>

			<ReleaseAutocomplete
				disabled={!productVersion}
				id="releaseRangeFrom"
				label="my-version"
				onChange={(value) =>
					onChange({...releaseRange, from: value, to: ''})
				}
				placeholder="select-version"
				releaseGroups={fromReleaseGroups}
				value={releaseRange.from}
			/>

			<ReleaseAutocomplete
				disabled={!productVersion || !releaseRange.from}
				id="releaseRangeTo"
				label="to"
				onChange={(value) => onChange({...releaseRange, to: value})}
				placeholder="select-version-comparison"
				releaseGroups={toReleaseGroups}
				value={releaseRange.to}
			/>
		</div>
	);
};

export default ReleaseComparison;
