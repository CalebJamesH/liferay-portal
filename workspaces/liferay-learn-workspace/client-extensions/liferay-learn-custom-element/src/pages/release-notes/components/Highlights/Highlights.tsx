/**
 * SPDX-FileCopyrightText: (c) 2026 Liferay, Inc. https://liferay.com
 * SPDX-License-Identifier: LGPL-2.1-or-later OR LicenseRef-Liferay-DXP-EULA-2.0.0-2023-06
 */

import {ClayPaginationBarWithBasicItems} from '@clayui/pagination-bar';
import {useEffect, useMemo, useState} from 'react';
import {
	IHighlight,
	IRelease,
	ReleaseNotesError,
} from '~/services/rest/releaseNotes';
import i18n from '~/utils/I18n';
import {getFormattedDate} from '~/utils/getFormattedDate';

import useHighlights from '../../../../hooks/useHighlights';
import {
	paginationDeltas,
	paginationLabels,
} from '../../../../utils/constants/paginationOptions';
import TabHeader from '../TabHeader/TabHeader';

import './Highlights.css';

type HighlightType =
	| 'importantChanges'
	| 'keyHighlights'
	| 'knownIssues'
	| 'security';

type HighlightsProps = {
	from: IRelease;
	to: IRelease;
};

const HIGHLIGHT_TYPES: {label: string; value: HighlightType}[] = [
	{label: 'key-highlights', value: 'keyHighlights'},
	{label: 'important-changes', value: 'importantChanges'},
	{label: 'known-issues', value: 'knownIssues'},
	{label: 'security', value: 'security'},
];

const QUARTERLY_RELEASE_HIGHLIGHTS_URL =
	'/release-notes/liferay-dxp/highlights';

const Highlights = ({from, to}: HighlightsProps) => {
	const [highlightTypes, setHighlightTypes] = useState<HighlightType[]>([]);
	const [page, setPage] = useState(1);
	const [pageSize, setPageSize] = useState(paginationDeltas[0].label);

	const {error, highlights, loading} = useHighlights({
		from: from.key,
		to: to.key,
	});

	useEffect(() => {
		setPage(1);
	}, [from.key, highlightTypes, to.key]);

	const filteredHighlights = useMemo<IHighlight[]>(() => {
		const items = highlights?.items ?? [];

		if (!highlightTypes.length) {
			return items;
		}

		return items.filter((highlight) =>
			highlightTypes.some((highlightType) => highlight[highlightType])
		);
	}, [highlights, highlightTypes]);

	const pageHighlights = filteredHighlights.slice(
		(page - 1) * pageSize,
		page * pageSize
	);

	const visibleHighlightTypes = highlightTypes.length
		? HIGHLIGHT_TYPES.filter(({value}) => highlightTypes.includes(value))
		: HIGHLIGHT_TYPES;

	const toggleHighlightType = (highlightType: HighlightType) =>
		setHighlightTypes((previousHighlightTypes) =>
			previousHighlightTypes.includes(highlightType)
				? previousHighlightTypes.filter(
						(previousHighlightType) =>
							previousHighlightType !== highlightType
					)
				: [...previousHighlightTypes, highlightType]
		);

	const renderHighlight = (highlight: IHighlight) => {
		const sections = visibleHighlightTypes.filter(
			({value}) => highlight[value]
		);

		return (
			<tr key={highlight.releaseKey}>
				<td className="highlights-date">
					{getFormattedDate(
						highlight.releaseDate &&
							`${highlight.releaseDate}T00:00:00`,
						'day2DMonthSYearN'
					)}
				</td>

				<td>
					<h3 className="highlights-title">{highlight.title}</h3>

					{sections.length ? (
						sections.map(({label, value}) => (
							<div className="highlights-section" key={value}>
								<h4>{i18n.translate(label)}</h4>

								<div
									className="highlights-section-body"
									dangerouslySetInnerHTML={{
										__html: highlight[value] as string,
									}}
								/>
							</div>
						))
					) : (
						<p className="highlights-none">
							{i18n.translate('no-highlights-for-this-release')}
						</p>
					)}
				</td>
			</tr>
		);
	};

	const renderResults = () => {
		if (loading) {
			return (
				<span className="cp-spinner ml-2 spinner-border spinner-border-sm"></span>
			);
		}

		if (error || !highlights) {
			const unauthorized =
				error instanceof ReleaseNotesError &&
				(error.status === 401 || error.status === 403);

			return (
				<div className="alert alert-warning">
					{i18n.translate(
						unauthorized
							? 'you-do-not-have-permission-to-access-the-requested-resource'
							: 'an-unexpected-error-occurred'
					)}
				</div>
			);
		}

		return (
			<>
				{highlights.hasQuarterlyReleases && (
					<div className="alert alert-info">
						{i18n.translate(
							'highlights-for-quarterly-releases-are-available-on-liferay-learn'
						)}{' '}
						<a href={QUARTERLY_RELEASE_HIGHLIGHTS_URL}>
							{i18n.translate(
								'view-quarterly-release-highlights'
							)}
						</a>
					</div>
				)}

				{!!filteredHighlights.length && (
					<>
						<p className="text-secondary">
							{i18n.sub(
								filteredHighlights.length === 1
									? 'x-result'
									: 'x-results',
								[String(filteredHighlights.length)]
							)}
						</p>

						<table className="highlights-table table table-list">
							<thead>
								<tr>
									<th>{i18n.translate('date')}</th>
									<th>{i18n.translate('release')}</th>
								</tr>
							</thead>

							<tbody>{pageHighlights.map(renderHighlight)}</tbody>
						</table>

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
						!!highlightTypes.length) && (
						<div className="highlights-empty text-center">
							<h3>
								{i18n.translate(
									'no-results-found-to-match-your-selection'
								)}
							</h3>

							<p className="text-secondary">
								{i18n.translate('try-modifying-your-criteria')}
							</p>
						</div>
					)}
			</>
		);
	};

	return (
		<div className="highlights release-notes-tab row">
			<div className="col-md-3 highlights-sidebar">
				<div className="align-items-center d-flex justify-content-between">
					<h3 className="m-0">{i18n.translate('refine-by')}</h3>

					{!!highlightTypes.length && (
						<button
							className="btn btn-link btn-sm"
							onClick={() => setHighlightTypes([])}
							type="button"
						>
							{i18n.translate('clear-all')}
						</button>
					)}
				</div>

				<div className="highlights-filter">
					{HIGHLIGHT_TYPES.map(({label, value}) => (
						<div
							className="custom-checkbox custom-control"
							key={value}
						>
							<label>
								<input
									checked={highlightTypes.includes(value)}
									className="custom-control-input"
									onChange={() => toggleHighlightType(value)}
									type="checkbox"
								/>

								<span className="custom-control-label">
									<span className="custom-control-label-text">
										{i18n.translate(label)}
									</span>
								</span>
							</label>
						</div>
					))}
				</div>
			</div>

			<div className="col-md-9">
				<TabHeader
					description="the-following-information-summarizes-the-important-changes-known-issues-and-security-details-in-each-release"
					title="highlights"
				/>

				{renderResults()}
			</div>
		</div>
	);
};

export default Highlights;
