/**
 * SPDX-FileCopyrightText: (c) 2026 Liferay, Inc. https://liferay.com
 * SPDX-License-Identifier: LGPL-2.1-or-later OR LicenseRef-Liferay-DXP-EULA-2.0.0-2023-06
 */

import {ClayPaginationBarWithBasicItems} from '@clayui/pagination-bar';
import {useEffect, useMemo, useState} from 'react';
import {IHighlight, IHighlights} from '~/services/rest/releaseNotes';
import i18n from '~/utils/I18n';
import {getFormattedDate} from '~/utils/getFormattedDate';
import toggleArrayItem from '~/utils/toggleArrayItem';

import useHighlights from '../../../../hooks/useHighlights';
import {
	paginationDeltas,
	paginationLabels,
} from '../../../../utils/constants/paginationOptions';
import EmptyState from '../EmptyState/EmptyState';
import Facet from '../Facet/Facet';
import TabHeader from '../TabHeader/TabHeader';
import TabResults from '../TabResults/TabResults';

import Checkbox from '~/components/Checkbox/Checkbox';
import {useReleaseNotesContext} from '~/components/ReleaseNotes/ReleaseNotesOutlet';

import './Highlights.scss';

type HighlightType =
	| 'importantChanges'
	| 'keyHighlights'
	| 'knownIssues'
	| 'security';

const HIGHLIGHTS: {label: string; value: HighlightType}[] = [
	{label: 'key-highlights', value: 'keyHighlights'},
	{label: 'important-changes', value: 'importantChanges'},
	{label: 'known-issues', value: 'knownIssues'},
	{label: 'security', value: 'security'},
];

const QUARTERLY_RELEASE_HIGHLIGHTS_URL =
	'/release-notes/liferay-dxp/highlights';

const Highlights = () => {
	const {from, to} = useReleaseNotesContext();

	const [selectedHighlights, setSelectedHighlights] = useState<
		HighlightType[]
	>([]);
	const [page, setPage] = useState(1);
	const [pageSize, setPageSize] = useState(paginationDeltas[0].label);

	const {error, highlights, loading} = useHighlights({
		from: from.key,
		to: to.key,
	});

	useEffect(() => {
		setPage(1);
	}, [from.key, selectedHighlights, to.key]);

	const filteredHighlights = useMemo<IHighlight[]>(() => {
		const items = highlights?.items ?? [];

		if (!selectedHighlights.length) {
			return items;
		}

		return items.filter((item) =>
			selectedHighlights.some((selectedHilight) => item[selectedHilight])
		);
	}, [highlights, selectedHighlights]);

	const pageHighlights = filteredHighlights.slice(
		(page - 1) * pageSize,
		page * pageSize
	);

	const visibleHighlightTypes = selectedHighlights.length
		? HIGHLIGHTS.filter(({value}) => selectedHighlights.includes(value))
		: HIGHLIGHTS;

	const renderHighlight = (highlight: IHighlight) => {
		const sections = visibleHighlightTypes.filter(
			({value}) => highlight[value]
		);

		return (
			<article
				className="c-gap-3 d-flex flex-column highlights-item"
				key={highlight.releaseKey}
			>
				<div className="align-items-start c-gap-2 d-flex flex-column">
					{highlight.releaseDate && (
						<span className="d-inline-block px-2 py-1 release-notes-tag rounded">
							{getFormattedDate(
								`${highlight.releaseDate}T00:00:00`,
								'day2DMonthSYearN'
							)}
						</span>
					)}

					<h3 className="font-weight-bold highlights-title m-0 text-8">
						{highlight.title}
					</h3>
				</div>

				{sections.length ? (
					sections.map(({label, value}) => (
						<div className="highlights-section" key={value}>
							<h4 className="font-weight-semi-bold highlights-section-title m-0 mb-1 text-5">
								{i18n.translate(label)}
							</h4>

							<div
								className="highlights-section-body text-4"
								dangerouslySetInnerHTML={{
									__html: highlight[value] as string,
								}}
							/>
						</div>
					))
				) : (
					<p className="font-italic highlights-none m-0 text-4">
						{i18n.translate('no-highlights-for-this-release')}
					</p>
				)}
			</article>
		);
	};

	const renderResults = (highlights: IHighlights) => (
		<>
			{highlights.hasQuarterlyReleases && (
				<div className="alert alert-info">
					{i18n.translate(
						'highlights-for-quarterly-releases-are-available-on-liferay-learn'
					)}{' '}
					<a href={QUARTERLY_RELEASE_HIGHLIGHTS_URL}>
						{i18n.translate('view-quarterly-release-highlights')}
					</a>
				</div>
			)}

			{!!filteredHighlights.length && (
				<>
					<div className="pt-2">
						{pageHighlights.map(renderHighlight)}
					</div>

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
						totalItems={filteredHighlights.length}
					/>
				</>
			)}

			{!filteredHighlights.length &&
				(!highlights.hasQuarterlyReleases ||
					!!selectedHighlights.length) && (
					<EmptyState
						description="try-modifying-your-criteria"
						title="no-results-found-to-match-your-selection"
					/>
				)}
		</>
	);

	return (
		<div className="align-items-start d-flex highlights release-notes-tab">
			<div className="release-notes-tab-main">
				<TabHeader
					description="the-following-information-summarizes-the-important-changes-known-issues-and-security-details-in-each-release"
					title="highlights"
				/>

				<TabResults data={highlights} error={error} loading={loading}>
					{renderResults}
				</TabResults>
			</div>

			<div className="c-gap-4 d-flex flex-column release-notes-tab-facets">
				<Facet
					clearDisabled={!selectedHighlights.length}
					collapsible
					id="highlightsTypes"
					onClear={() => setSelectedHighlights([])}
					onSelectAll={() =>
						setSelectedHighlights(
							HIGHLIGHTS.map(({value}) => value)
						)
					}
					selectAllDisabled={
						selectedHighlights.length === HIGHLIGHTS.length
					}
					title="refine-by"
				>
					{HIGHLIGHTS.map(({label, value}) => (
						<Checkbox
							checked={selectedHighlights.includes(value)}
							key={value}
							label={i18n.translate(label)}
							onChange={() =>
								setSelectedHighlights(
									(previousSelectedHighlights) =>
										toggleArrayItem(
											previousSelectedHighlights,
											value
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

export default Highlights;
