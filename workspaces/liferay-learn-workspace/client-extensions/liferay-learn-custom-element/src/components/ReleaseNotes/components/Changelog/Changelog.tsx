/**
 * SPDX-FileCopyrightText: (c) 2026 Liferay, Inc. https://liferay.com
 * SPDX-License-Identifier: LGPL-2.1-or-later OR LicenseRef-Liferay-DXP-EULA-2.0.0-2023-06
 */

import {ClayPaginationBarWithBasicItems} from '@clayui/pagination-bar';
import classNames from 'classnames';
import {useMemo, useState} from 'react';
import {IChangelog, IChangelogIssue} from '~/services/rest/releaseNotes';
import i18n from '~/utils/I18n';
import toggleArrayItem from '~/utils/toggleArrayItem';

import useChangelog from '../../../../hooks/useChangelog';
import useChangelogComponents from '../../../../hooks/useChangelogComponents';
import {
	paginationDeltas,
	paginationLabels,
} from '../../../../utils/constants/paginationOptions';
import EmptyState from '../EmptyState/EmptyState';
import Facet from '../Facet/Facet';
import TabResults from '../TabResults/TabResults';

import Checkbox from '~/components/Checkbox/Checkbox';
import Input from '~/components/Input/Input';
import Button from '~/components/Button/Button';
import {useReleaseNotesContext} from '~/components/ReleaseNotes/ReleaseNotesOutlet';
import Table, {IColumn, IRow} from '~/components/Table/Table';

import './Changelog.scss';

const COMPONENTS_DELTA = 10;

const Changelog = () => {
	const {from, to} = useReleaseNotesContext();

	const [componentKeywords, setComponentKeywords] = useState('');
	const [pageSize, setPageSize] = useState(paginationDeltas[0].label);
	const [selectedComponents, setSelectedComponents] = useState<string[]>([]);
	const [viewAllComponents, setViewAllComponents] = useState(false);

	const search = JSON.stringify([
		selectedComponents,
		from.key,
		pageSize,
		to.key,
	]);

	const [searchPage, setSearchPage] = useState({page: 1, search});

	const page = searchPage.search === search ? searchPage.page : 1;

	const {changelog, error, loading} = useChangelog({
		components: selectedComponents,
		from: from.key,
		keywords: '',
		page,
		pageSize,
		to: to.key,
	});

	const {components} = useChangelogComponents();

	const filteredComponents = useMemo(() => {
		const keywords = componentKeywords.trim().toLowerCase();

		if (!keywords) {
			return components;
		}

		return components.filter((component) =>
			component.toLowerCase().includes(keywords)
		);
	}, [componentKeywords, components]);

	const componentItems = useMemo(
		() => [
			...selectedComponents,
			...filteredComponents.filter(
				(fitleredComponent) =>
					!selectedComponents.includes(fitleredComponent)
			),
		],
		[selectedComponents, filteredComponents]
	);

	const visibleComponentItems = viewAllComponents
		? componentItems
		: componentItems.slice(
				0,
				Math.max(COMPONENTS_DELTA, selectedComponents.length)
			);

	const clearComponents = () => {
		setComponentKeywords('');
		setSelectedComponents([]);
	};

	const getIssueRow = (issue: IChangelogIssue): IRow => ({
		components: issue.components.length ? (
			<div className="c-gap-1 d-flex flex-wrap">
				{issue.components.map((component) => (
					<span
						className="border-0 changelog-tag d-block font-weight-normal h-auto label m-0 mw-100 overflow-hidden px-2 py-1 text-nowrap"
						key={component}
					>
						{component}
					</span>
				))}
			</div>
		) : (
			'-'
		),
		id: issue.key,
		key: (
			<a
				className="font-weight-normal"
				href={issue.url}
				rel="noopener noreferrer"
				target="_blank"
			>
				{issue.key}
			</a>
		),
		releases: issue.releases.length
			? issue.releases.map((release) => (
					<div key={release}>
						{release.replace(/\s+Quarterly Release/i, '')}
					</div>
				))
			: '-',
		summary: issue.summary,
	});

	const renderResults = (changelog: IChangelog) => {
		if (!changelog.total) {
			return (
				<EmptyState
					description="try-modifying-your-criteria"
					title="no-results-found-to-match-your-selection"
				/>
			);
		}

		const columns: IColumn[] = [
			{
				className: 'changelog-summary',
				columnKey: 'summary',
				label: i18n.translate('summary'),
			},
			{
				className: 'changelog-components',
				columnKey: 'components',
				label: i18n.translate('component'),
			},
			{
				className: 'changelog-releases text-nowrap',
				columnKey: 'releases',
				label: i18n.translate('release'),
			},
			{
				className: 'changelog-key text-nowrap',
				columnKey: 'key',
				label: i18n.translate('key'),
			},
		];

		return (
			<>
				<Table
					className="changelog-table release-notes-table"
					columns={columns}
					rows={changelog.items.map(getIssueRow)}
				/>

				<ClayPaginationBarWithBasicItems
					active={page}
					activeDelta={pageSize}
					deltas={paginationDeltas}
					labels={paginationLabels}
					onActiveChange={(value: number) =>
						setSearchPage({page: value, search})
					}
					onDeltaChange={(value: number) => setPageSize(value)}
					totalItems={changelog.total}
				/>
			</>
		);
	};

	return (
		<div className="align-items-start changelog d-flex release-notes-tab">
			<div className="release-notes-tab-main">
				<TabResults data={changelog} error={error} loading={loading}>
					{renderResults}
				</TabResults>
			</div>

			<div className="c-gap-4 d-flex flex-column release-notes-tab-facets">
				<Facet
					clearDisabled={
						!selectedComponents.length && !componentKeywords
					}
					collapsible
					id="changelogComponents"
					onClear={clearComponents}
					onSelectAll={() =>
						setSelectedComponents([
							...selectedComponents,
							...filteredComponents.filter(
								(filteredComponent) =>
									!selectedComponents.includes(
										filteredComponent
									)
							),
						])
					}
					selectAllDisabled={
						!componentKeywords.trim() ||
						filteredComponents.every((filteredComponent) =>
							selectedComponents.includes(filteredComponent)
						)
					}
					title="refine-by"
				>
					<Input
						placeholder="search"
						onChange={(event) =>
							setComponentKeywords(event.target.value)
						}
						value={componentKeywords}
					/>

					{!!components.length && !componentItems.length && (
						<p className="changelog-components-empty m-0">
							{i18n.translate('no-results-found')}
						</p>
					)}

					<div
						className={classNames(
							'changelog-components-list d-flex flex-column',
							{'changelog-components-list-all': viewAllComponents}
						)}
					>
						{visibleComponentItems.map((component) => (
							<Checkbox
								checked={selectedComponents.includes(component)}
								key={component}
								label={component}
								onChange={() =>
									setSelectedComponents(
										(previousSelectedComponents) =>
											toggleArrayItem(
												previousSelectedComponents,
												component
											)
									)
								}
							/>
						))}
					</div>

					{componentItems.length >
						Math.max(
							COMPONENTS_DELTA,
							selectedComponents.length
						) && (
						<Button
							className="align-self-start mt-1 p-0 release-notes-facet-view-all"
							displayType="unstyled"
							onClick={() =>
								setViewAllComponents(!viewAllComponents)
							}
						>
							{i18n.translate(
								viewAllComponents ? 'view-less' : 'view-all'
							)}
						</Button>
					)}
				</Facet>
			</div>
		</div>
	);
};

export default Changelog;
