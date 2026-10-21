/**
 * SPDX-FileCopyrightText: (c) 2026 Liferay, Inc. https://liferay.com
 * SPDX-License-Identifier: LGPL-2.1-or-later OR LicenseRef-Liferay-DXP-EULA-2.0.0-2023-06
 */

import {useMemo} from 'react';
import {IProductVersion} from '~/services/rest/releaseNotes';
import i18n from '~/utils/I18n';

import ReleaseAutocomplete, {
	ReleaseGroup,
} from '../ReleaseAutocomplete/ReleaseAutocomplete';

import './ReleaseRangeFilters.css';

const PRODUCT_VERSION_KEY_7_4 = '7.4';

export type ReleaseRange = {
	from: string;
	productVersion: string;
	to: string;
};

type ReleaseSelectProps = {
	id: string;
	label: string;
	onChange: (value: string) => void;
	options: {key: string; name: string}[];
	placeholder: string;
	value: string;
};

type ReleaseRangeFiltersProps = {
	onChange: (releaseRange: ReleaseRange) => void;
	productVersions: IProductVersion[];
	releaseRange: ReleaseRange;
};

const ReleaseSelect = ({
	id,
	label,
	onChange,
	options,
	placeholder,
	value,
}: ReleaseSelectProps) => (
	<div className="form-group release-range-filter">
		<label htmlFor={id}>{i18n.translate(label)}</label>

		<select
			className="form-control"
			id={id}
			onChange={(event) => onChange(event.target.value)}
			value={value}
		>
			<option value="">{i18n.translate(placeholder)}</option>

			{options.map((option) => (
				<option key={option.key} value={option.key}>
					{option.name}
				</option>
			))}
		</select>
	</div>
);

export function getToReleaseGroups(
	productVersions: IProductVersion[],
	productVersionKey: string,
	from: string
): ReleaseGroup[] {
	const index = productVersions.findIndex(
		(productVersion) => productVersion.key === productVersionKey
	);

	if (index < 0 || !from) {
		return [];
	}

	const productVersion = productVersions[index];

	const releaseIndex = productVersion.releases.findIndex(
		(release) => release.key === from
	);

	if (releaseIndex < 0) {
		return [];
	}

	const laterReleaseGroups = productVersions
		.slice(index + 1)
		.filter(
			(laterProductVersion) =>
				laterProductVersion.line === productVersion.line
		)
		.map(({key, name, releases}) => ({key, name, releases}));

	if (productVersion.key === PRODUCT_VERSION_KEY_7_4) {
		return laterReleaseGroups;
	}

	return [
		{
			key: productVersion.key,
			name: productVersion.name,
			releases: productVersion.releases.slice(releaseIndex),
		},
		...laterReleaseGroups,
	];
}

const ReleaseRangeFilters = ({
	onChange,
	productVersions,
	releaseRange,
}: ReleaseRangeFiltersProps) => {
	const productVersion = useMemo(
		() =>
			productVersions.find(
				(productVersion) =>
					productVersion.key === releaseRange.productVersion
			),
		[productVersions, releaseRange.productVersion]
	);

	const fromReleaseGroups = useMemo<ReleaseGroup[]>(
		() =>
			productVersion
				? [
						{
							key: productVersion.key,
							name: productVersion.name,
							releases: productVersion.releases,
						},
					]
				: [],
		[productVersion]
	);

	const toReleaseGroups = useMemo(
		() =>
			getToReleaseGroups(
				productVersions,
				releaseRange.productVersion,
				releaseRange.from
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
		<div className="d-flex flex-wrap release-range-filters">
			<ReleaseSelect
				id="releaseRangeProductVersion"
				label="product"
				onChange={handleProductVersionChange}
				options={productVersions}
				placeholder="select-product"
				value={releaseRange.productVersion}
			/>

			<ReleaseAutocomplete
				disabled={!productVersion}
				id="releaseRangeFrom"
				label="from"
				onChange={(value) =>
					onChange({...releaseRange, from: value, to: ''})
				}
				placeholder="select-release"
				releaseGroups={fromReleaseGroups}
				value={releaseRange.from}
			/>

			<ReleaseAutocomplete
				disabled={!productVersion || !releaseRange.from}
				id="releaseRangeTo"
				label="to"
				onChange={(value) => onChange({...releaseRange, to: value})}
				placeholder="select-release"
				releaseGroups={toReleaseGroups}
				value={releaseRange.to}
			/>
		</div>
	);
};

export default ReleaseRangeFilters;
