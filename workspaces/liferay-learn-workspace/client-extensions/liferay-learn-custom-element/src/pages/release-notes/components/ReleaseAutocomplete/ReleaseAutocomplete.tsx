/**
 * SPDX-FileCopyrightText: (c) 2026 Liferay, Inc. https://liferay.com
 * SPDX-License-Identifier: LGPL-2.1-or-later OR LicenseRef-Liferay-DXP-EULA-2.0.0-2023-06
 */

import ClayAutocomplete from '@clayui/autocomplete';
import {useEffect, useMemo, useState} from 'react';
import {IRelease} from '~/services/rest/releaseNotes';
import i18n from '~/utils/I18n';

import './ReleaseAutocomplete.css';

export type ReleaseGroup = {
	key: string;
	name: string;
	releases: IRelease[];
};

type ReleaseItem = {
	key: string;
	name: string;
	productName: string;
	searchText: string;
};

type ReleaseAutocompleteProps = {
	disabled?: boolean;
	id: string;
	label: string;
	onChange: (value: string) => void;
	placeholder: string;
	releaseGroups: ReleaseGroup[];
	value: string;
};

const ALIASES: [RegExp, (match: RegExpMatchArray) => string][] = [
	[/^Update (\d+)/, (match) => `u${match[1]}`],
	[/^Fix Pack (\d+)/, (match) => `fp${match[1]}`],
	[/^Service Pack (\d+)/, (match) => `sp${match[1]}`],
];

const normalize = (text: string) => text.toLowerCase().replace(/\s+/g, '');

function getSearchText(name: string, productName: string) {
	const texts = [name, productName];

	ALIASES.forEach(([regExp, getAlias]) => {
		const match = name.match(regExp);

		if (match) {
			texts.push(getAlias(match));
		}
	});

	return texts.map(normalize).join('|');
}

const ReleaseAutocomplete = ({
	disabled = false,
	id,
	label,
	onChange,
	placeholder,
	releaseGroups,
	value,
}: ReleaseAutocompleteProps) => {
	const releaseItems = useMemo<ReleaseItem[]>(
		() =>
			releaseGroups.flatMap((releaseGroup) =>
				releaseGroup.releases.map((release) => ({
					key: release.key,
					name: release.name,
					productName: releaseGroup.name,
					searchText: getSearchText(release.name, releaseGroup.name),
				}))
			),
		[releaseGroups]
	);

	const selectedReleaseItem = releaseItems.find(
		(releaseItem) => releaseItem.key === value
	);

	const [inputValue, setInputValue] = useState(
		selectedReleaseItem?.name ?? ''
	);

	useEffect(() => {
		setInputValue(selectedReleaseItem?.name ?? '');
	}, [selectedReleaseItem]);

	const filteredReleaseItems = useMemo(() => {
		if (!inputValue || inputValue === selectedReleaseItem?.name) {
			return releaseItems;
		}

		const query = normalize(inputValue);

		return releaseItems.filter((releaseItem) =>
			releaseItem.searchText.includes(query)
		);
	}, [inputValue, releaseItems, selectedReleaseItem]);

	const showProductName = releaseGroups.length > 1;

	const releaseItemsKey = releaseGroups
		.map(
			(releaseGroup) =>
				`${releaseGroup.key}:${releaseGroup.releases[0]?.key}:${releaseGroup.releases.length}`
		)
		.join('|');

	if (!releaseItems.length) {
		return (
			<div className="form-group release-range-filter">
				<label htmlFor={id}>{i18n.translate(label)}</label>

				<input
					className="form-control"
					disabled
					id={id}
					placeholder={i18n.translate(placeholder)}
					type="text"
				/>
			</div>
		);
	}

	return (
		<div className="form-group release-range-filter">
			<label htmlFor={id}>{i18n.translate(label)}</label>

			<ClayAutocomplete
				disabled={disabled}
				key={releaseItemsKey}
				filterKey="name"
				id={id}
				items={filteredReleaseItems}
				menuTrigger="focus"
				messages={{
					loading: i18n.translate('loading'),
					notFound: i18n.translate('no-results-found'),
				}}
				onChange={(text: string) => {
					setInputValue(text);

					if (!text) {
						onChange('');
					}
				}}
				onItemsChange={() => {}}
				placeholder={i18n.translate(placeholder)}
				selectedKeys={value ? [value] : []}
				value={inputValue}
			>
				{(releaseItem: ReleaseItem) => (
					<ClayAutocomplete.Item
						key={releaseItem.key}
						onClick={() => onChange(releaseItem.key)}
						textValue={releaseItem.name}
					>
						<span className="release-autocomplete-item">
							<span>{releaseItem.name}</span>

							{showProductName && (
								<span className="release-autocomplete-product text-secondary">
									{releaseItem.productName}
								</span>
							)}
						</span>
					</ClayAutocomplete.Item>
				)}
			</ClayAutocomplete>
		</div>
	);
};

export default ReleaseAutocomplete;
