/**
 * SPDX-FileCopyrightText: (c) 2026 Liferay, Inc. https://liferay.com
 * SPDX-License-Identifier: LGPL-2.1-or-later OR LicenseRef-Liferay-DXP-EULA-2.0.0-2023-06
 */

import ClayIcon from '@clayui/icon';
import {useEffect, useMemo, useState} from 'react';
import {Highlight, HighlightsResponse} from '~/services/rest/releaseNotes';
import i18n from '~/utils/I18n';
import {getFormattedDate} from '~/utils/getFormattedDate';
import toggleArrayItem from '~/utils/toggleArrayItem';

import useHighlights from '../../../../hooks/useHighlights';
import EmptyState from '../EmptyState/EmptyState';
import Facet from '../Facet/Facet';
import Pagination from '../Pagination/Pagination';
import SearchFacet from '../SearchFacet/SearchFacet';
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

const PAGE_SIZE = 10;

const QUARTERLY_RELEASE_HIGHLIGHTS_URL =
	'/release-notes/liferay-dxp/highlights';

const Highlights = () => {
	const {from, to} = useReleaseNotesContext();

	const [selectedHighlights, setSelectedHighlights] = useState<
		HighlightType[]
	>([]);
	const [dateAscending, setDateAscending] = useState(false);
	const [keywords, setKeywords] = useState('');
	const [page, setPage] = useState(1);

	const {error, highlights, loading} = useHighlights({
		from: from.key,
		to: to.key,
	});

	useEffect(() => {
		setPage(1);
	}, [dateAscending, from.key, keywords, selectedHighlights, to.key]);

	const filteredHighlights = useMemo<Highlight[]>(() => {
		const normalizedKeywords = keywords.trim().toLowerCase();

		const items = (highlights?.items ?? [])
			.filter(
				(item) =>
					!selectedHighlights.length ||
					selectedHighlights.some(
						(selectedHighlight) => item[selectedHighlight]
					)
			)
			.filter(
				(item) =>
					!normalizedKeywords ||
					[
						item.title,
						...HIGHLIGHTS.map(({value}) =>
							(item[value] ?? '').replace(/<[^>]*>/g, ' ')
						),
					]
						.join(' ')
						.toLowerCase()
						.includes(normalizedKeywords)
			);

		return [...items].sort((a, b) => {
			const order = (a.releaseDate ?? '').localeCompare(
				b.releaseDate ?? ''
			);

			return dateAscending ? order : -order;
		});
	}, [dateAscending, highlights, keywords, selectedHighlights]);

	const pageHighlights = filteredHighlights.slice(
		(page - 1) * PAGE_SIZE,
		page * PAGE_SIZE
	);

	const visibleHighlightTypes = selectedHighlights.length
		? HIGHLIGHTS.filter(({value}) => selectedHighlights.includes(value))
		: HIGHLIGHTS;

	const renderHighlight = (highlight: Highlight) => {
		const sections = visibleHighlightTypes.filter(
			({value}) => highlight[value]
		);

		return (
			<tr className="highlights-item" key={highlight.releaseKey}>
				<td className="highlights-date text-nowrap">
					{getFormattedDate(
						highlight.releaseDate
							? `${highlight.releaseDate}T00:00:00`
							: undefined,
						'monthSDayNYearN'
					)}
				</td>

				<td>
					<div className="c-gap-3 d-flex flex-column">
						<h3 className="font-weight-bold highlights-title m-0 text-6">
							{highlight.title}
						</h3>

						{sections.length ? (
							sections.map(({label, value}) => (
								<div className="highlights-section" key={value}>
									<h4 className="font-weight-semi-bold highlights-section-title m-0 mb-1 text-4">
										{i18n.translate(label)}
									</h4>

									<div
										className="highlights-section-body text-3"
										dangerouslySetInnerHTML={{
											__html: highlight[value] as string,
										}}
									/>
								</div>
							))
						) : (
							<p className="font-italic highlights-none m-0 text-3">
								{i18n.translate('no-highlights-for-this-release')}
							</p>
						)}
					</div>
				</td>
			</tr>
		);
	};

	const renderResults = (highlights: HighlightsResponse) => (
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
					<table className="highlights-table release-notes-table">
						<thead>
							<tr>
								<th className="highlights-date">
									<button
										className="align-items-center btn btn-unstyled c-gap-1 d-inline-flex highlights-sort p-0"
										onClick={() =>
											setDateAscending(!dateAscending)
										}
										type="button"
									>
										{i18n.translate('date')}

										<ClayIcon symbol="order-arrow" />
									</button>
								</th>

								<th>{i18n.translate('release')}</th>
							</tr>
						</thead>

						<tbody>{pageHighlights.map(renderHighlight)}</tbody>
					</table>

					<Pagination
						active={page}
						onActiveChange={setPage}
						pageSize={PAGE_SIZE}
						totalItems={filteredHighlights.length}
					/>
				</>
			)}

			{!filteredHighlights.length &&
				(!highlights.hasQuarterlyReleases ||
					!!selectedHighlights.length ||
					!!keywords.trim()) && (
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
				<SearchFacet
					id="highlightsSearch"
					onChange={setKeywords}
					value={keywords}
				/>

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
					title="type"
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
