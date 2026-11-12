/**
 * SPDX-FileCopyrightText: (c) 2026 Liferay, Inc. https://liferay.com
 * SPDX-License-Identifier: LGPL-2.1-or-later OR LicenseRef-Liferay-DXP-EULA-2.0.0-2023-06
 */

import {ClayToggle} from '@clayui/form';
import {ClayPaginationBarWithBasicItems} from '@clayui/pagination-bar';
import {useEffect, useMemo, useState} from 'react';
import {IModuleChange, IModuleChanges} from '~/services/rest/releaseNotes';
import i18n from '~/utils/I18n';
import toggleArrayItem from '~/utils/toggleArrayItem';

import useModuleChanges from '~/hooks/useModuleChanges';
import {
	paginationDeltas,
	paginationLabels,
} from '~/utils/constants/paginationOptions';
import EmptyState from '../EmptyState/EmptyState';
import Facet from '../Facet/Facet';
import TabHeader from '../TabHeader/TabHeader';
import TabResults from '../TabResults/TabResults';

import Checkbox from '~/components/Checkbox/Checkbox';
import Input from '~/components/Input/Input';
import {useReleaseNotesContext} from '~/components/ReleaseNotes/ReleaseNotesOutlet';
import Table, {IColumn, IRow} from '~/components/Table/Table';

import './ModuleChanges.scss';

type ModuleChangesProps = {
	owners: {label: string; value: string}[];
};

const ModuleDownloadLink = ({
	url,
	version,
}: {
	url?: string;
	version?: string;
}) => {
	if (!version || !url) {
		return version ? <>{version}</> : <>-</>;
	}

	return (
		<a href={url} rel="noopener noreferrer" target="_blank">
			{version}
		</a>
	);
};

const ModuleChanges = ({owners}: ModuleChangesProps) => {
	const {from, to} = useReleaseNotesContext();

	const [changesOnly, setChangesOnly] = useState(false);
	const [keywords, setKeywords] = useState('');
	const [keywordsInput, setKeywordsInput] = useState('');
	const [selectedOwners, setSelectedOwners] = useState<string[]>([]);
	const [page, setPage] = useState(1);
	const [pageSize, setPageSize] = useState(paginationDeltas[0].label);

	const {error, loading, moduleChanges} = useModuleChanges({
		changesOnly,
		from: from.key,
		keywords,
		owners: selectedOwners.length
			? selectedOwners
			: owners.map((owner) => owner.value),
		to: to.key,
	});

	useEffect(() => {
		const timeout = setTimeout(
			() => setKeywords(keywordsInput.trim()),
			500
		);

		return () => clearTimeout(timeout);
	}, [keywordsInput]);

	useEffect(() => {
		setPage(1);
	}, [changesOnly, from.key, keywords, selectedOwners, to.key]);

	const pageItems = useMemo<IModuleChange[]>(
		() =>
			moduleChanges?.items.slice(
				(page - 1) * pageSize,
				page * pageSize
			) ?? [],
		[moduleChanges, page, pageSize]
	);

	const renderResults = (moduleChanges: IModuleChanges) => {
		if (!moduleChanges.total) {
			return (
				<EmptyState
					description="try-modifying-your-criteria"
					title="no-results-found-to-match-your-selection"
				/>
			);
		}

		const columns: IColumn[] = [
			{
				columnKey: 'name',
				label: i18n.translate('name'),
			},
			{
				columnKey: 'group',
				label: i18n.translate('group'),
			},
			{
				className: 'module-changes-version',
				columnKey: 'fromVersion',
				label: from.name,
			},
			{
				className: 'module-changes-version',
				columnKey: 'toVersion',
				label: to.name,
			},
		];

		const rows: IRow[] = pageItems.map((moduleChange) => ({
			className:
				moduleChange.fromVersion !== moduleChange.toVersion
					? 'module-changes-changed'
					: undefined,
			fromVersion: (
				<ModuleDownloadLink
					url={moduleChange.fromURL}
					version={moduleChange.fromVersion}
				/>
			),
			group: moduleChange.group,
			id: `${moduleChange.group}:${moduleChange.name}`,
			name: moduleChange.name,
			toVersion: (
				<ModuleDownloadLink
					url={moduleChange.toURL}
					version={moduleChange.toVersion}
				/>
			),
		}));

		return (
			<>
				<Table
					className="module-changes-table release-notes-table"
					columns={columns}
					rows={rows}
				/>

				<ClayPaginationBarWithBasicItems
					active={page}
					activeDelta={pageSize}
					deltas={paginationDeltas}
					labels={paginationLabels}
					onActiveChange={(value: number) => setPage(value)}
					onDeltaChange={(value: number) => {
						setPage(1);
						setPageSize(value);
					}}
					totalItems={moduleChanges.total}
				/>
			</>
		);
	};

	return (
		<div className="align-items-start d-flex module-changes release-notes-tab">
			<div className="release-notes-tab-main">
				<TabHeader
					description="reference-the-bundle-or-module-version-you-should-compile-against"
					title="module-version-changes"
				/>

				<TabResults
					data={moduleChanges}
					error={error}
					loading={loading}
					notFoundMessage="module-changes-are-not-available-for-the-selected-releases"
				>
					{renderResults}
				</TabResults>
			</div>

			<div className="c-gap-4 d-flex flex-column release-notes-tab-facets">
				<Facet id="moduleChangesSearch" title="search">
					<Input
						placeholder={i18n.translate('name')}
						onChange={(event) =>
							setKeywordsInput(event.target.value)
						}
						value={keywordsInput}
					/>
				</Facet>

				<Facet collapsible id="moduleChangesFilters" title="refine-by">
					{owners.map((owner) => (
						<Checkbox
							checked={selectedOwners.includes(owner.value)}
							key={owner.value}
							label={i18n.translate(owner.label)}
							onChange={() =>
								setSelectedOwners((previousSelectedOwners) =>
									toggleArrayItem(
										previousSelectedOwners,
										owner.value
									)
								)
							}
						/>
					))}

					<h4 className="font-weight-semi-bold m-0 mt-1 release-notes-facet-section-title">
						{i18n.translate('only-show')}
					</h4>

					<ClayToggle
						containerProps={{
							className: 'm-0 module-changes-toggle',
						}}
						label={i18n.translate('changes')}
						onToggle={setChangesOnly}
						toggled={changesOnly}
					/>
				</Facet>
			</div>
		</div>
	);
};

export default ModuleChanges;
