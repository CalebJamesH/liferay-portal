/**
 * SPDX-FileCopyrightText: (c) 2026 Liferay, Inc. https://liferay.com
 * SPDX-License-Identifier: LGPL-2.1-or-later OR LicenseRef-Liferay-DXP-EULA-2.0.0-2023-06
 */

import classNames from 'classnames';
import {useEffect, useMemo, useState} from 'react';
import {ChangelogIssue, ChangelogResponse} from '~/services/rest/releaseNotes';
import i18n from '~/utils/I18n';
import toggleArrayItem from '~/utils/toggleArrayItem';

import useChangelog from '../../../../hooks/useChangelog';
import useChangelogComponents from '../../../../hooks/useChangelogComponents';
import EmptyState from '../EmptyState/EmptyState';
import Facet from '../Facet/Facet';
import Pagination from '../Pagination/Pagination';
import SearchFacet from '../SearchFacet/SearchFacet';
import TabHeader from '../TabHeader/TabHeader';
import TabResults from '../TabResults/TabResults';

import Checkbox from '~/components/Checkbox/Checkbox';
import Input from '~/components/Input/Input';
import Button from '~/components/Button/Button';
import {useReleaseNotesContext} from '~/components/ReleaseNotes/ReleaseNotesOutlet';
import Table, {Column, Row} from '~/components/Table/Table';

import './Changelog.scss';

const COMPONENTS_DELTA = 10;
const PAGE_SIZE = 10;

const Changelog = () => {
	const {from, to} = useReleaseNotesContext();

	const [componentKeywords, setComponentKeywords] = useState('');
	const [keywords, setKeywords] = useState('');
	const [keywordsInput, setKeywordsInput] = useState('');
	const [selectedComponents, setSelectedComponents] = useState<string[]>([]);
	const [viewAllComponents, setViewAllComponents] = useState(false);

	const search = JSON.stringify([
		selectedComponents,
		from.key,
		keywords,
		to.key,
	]);

	const [searchPage, setSearchPage] = useState({page: 1, search});

	const page = searchPage.search === search ? searchPage.page : 1;

	const {changelog, error, loading} = useChangelog({
		components: selectedComponents,
		from: from.key,
		keywords,
		page,
		pageSize: PAGE_SIZE,
		to: to.key,
	});

	useEffect(() => {
		const timeout = setTimeout(
			() => setKeywords(keywordsInput.trim()),
			500
		);

		return () => clearTimeout(timeout);
	}, [keywordsInput]);

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

	const getIssueRow = (issue: ChangelogIssue): Row => ({
		components: issue.components.length ? (
			<div className="c-gap-1 d-flex flex-wrap">
				{issue.components.map((component) => (
					<span
						className="border-0 changelog-tag d-block h-auto label m-0 mw-100 px-2 py-1"
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
				className="changelog-key-link"
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

	const renderResults = (changelog: ChangelogResponse) => {
		if (!changelog.total) {
			return (
				<EmptyState
					description="try-modifying-your-criteria"
					title="no-results-found-to-match-your-selection"
				/>
			);
		}

		const columns: Column[] = [
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

				<Pagination
					active={page}
					onActiveChange={(value: number) =>
						setSearchPage({page: value, search})
					}
					pageSize={PAGE_SIZE}
					totalItems={changelog.total}
				/>
			</>
		);
	};

	return (
		<div className="align-items-start changelog d-flex release-notes-tab">
			<div className="release-notes-tab-main">
				<TabHeader
					description="reference-all-the-fixes-and-improvements-included-in-your-fix-pack-range"
					title="changelog"
				/>

				<TabResults data={changelog} error={error} loading={loading}>
					{renderResults}
				</TabResults>
			</div>

			<div className="c-gap-4 d-flex flex-column release-notes-tab-facets">
				<SearchFacet
					id="changelogSearch"
					onChange={setKeywordsInput}
					value={keywordsInput}
				/>

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
					title="component"
				>
					<Input
						icon="search"
						placeholder={i18n.translate('filter')}
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
