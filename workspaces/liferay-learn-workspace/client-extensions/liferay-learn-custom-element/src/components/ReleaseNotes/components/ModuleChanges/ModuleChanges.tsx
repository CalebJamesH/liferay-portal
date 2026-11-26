/**
 * SPDX-FileCopyrightText: (c) 2026 Liferay, Inc. https://liferay.com
 * SPDX-License-Identifier: LGPL-2.1-or-later OR LicenseRef-Liferay-DXP-EULA-2.0.0-2023-06
 */

import {ClayToggle} from '@clayui/form';
import ClayIcon from '@clayui/icon';
import {useEffect, useMemo, useState} from 'react';
import {ModuleChange, ModuleChangesResponse} from '~/services/rest/releaseNotes';
import i18n from '~/utils/I18n';
import toggleArrayItem from '~/utils/toggleArrayItem';

import useModuleChanges from '~/hooks/useModuleChanges';
import EmptyState from '../EmptyState/EmptyState';
import Facet from '../Facet/Facet';
import Pagination from '../Pagination/Pagination';
import SearchFacet from '../SearchFacet/SearchFacet';
import TabHeader from '../TabHeader/TabHeader';
import TabResults from '../TabResults/TabResults';

import Checkbox from '~/components/Checkbox/Checkbox';
import {useReleaseNotesContext} from '~/components/ReleaseNotes/ReleaseNotesOutlet';
import Table, {Column, Row} from '~/components/Table/Table';

import './ModuleChanges.scss';

type ModuleChangesProps = {
	owners: {label: string; value: string}[];
};

const PAGE_SIZE = 10;

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
		<a
			className="align-items-center c-gap-1 d-inline-flex"
			href={url}
			rel="noopener noreferrer"
			target="_blank"
		>
			{version}

			<ClayIcon symbol="download" />
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

	const pageItems = useMemo<ModuleChange[]>(
		() =>
			moduleChanges?.items.slice(
				(page - 1) * PAGE_SIZE,
				page * PAGE_SIZE
			) ?? [],
		[moduleChanges, page]
	);

	const renderResults = (moduleChanges: ModuleChangesResponse) => {
		if (!moduleChanges.total) {
			return (
				<EmptyState
					description="try-modifying-your-criteria"
					title="no-results-found-to-match-your-selection"
				/>
			);
		}

		const columns: Column[] = [
			{
				columnKey: 'name',
				label: i18n.translate('module'),
			},
			{
				className: 'module-changes-status',
				columnKey: 'status',
				label: '',
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

		const rows: Row[] = pageItems.map((moduleChange) => ({
			fromVersion: (
				<ModuleDownloadLink
					url={moduleChange.fromURL}
					version={moduleChange.fromVersion}
				/>
			),
			group: moduleChange.group,
			id: `${moduleChange.group}:${moduleChange.name}`,
			name: moduleChange.name,
			status:
				moduleChange.fromVersion !== moduleChange.toVersion ? (
					<span className="border-0 d-inline-block label m-0 module-changes-tag px-2 py-1">
						{i18n.translate('changed')}
					</span>
				) : (
					'-'
				),
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

				<Pagination
					active={page}
					onActiveChange={setPage}
					pageSize={PAGE_SIZE}
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
					title="modules-version-changes"
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
				<SearchFacet
					id="moduleChangesSearch"
					onChange={setKeywordsInput}
					value={keywordsInput}
				/>

				<section className="bg-neutral-1 p-3 release-notes-facet">
					<ClayToggle
						containerProps={{
							className: 'm-0 module-changes-toggle',
						}}
						label={i18n.translate('only-show-changes')}
						onToggle={setChangesOnly}
						toggled={changesOnly}
					/>
				</section>

				<Facet
					clearDisabled={!selectedOwners.length}
					collapsible
					id="moduleChangesFilters"
					onClear={() => setSelectedOwners([])}
					onSelectAll={() =>
						setSelectedOwners(owners.map((owner) => owner.value))
					}
					selectAllDisabled={selectedOwners.length === owners.length}
					title="group"
				>
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
				</Facet>
			</div>
		</div>
	);
};

export default ModuleChanges;
