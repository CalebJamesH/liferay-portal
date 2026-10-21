/**
 * SPDX-FileCopyrightText: (c) 2026 Liferay, Inc. https://liferay.com
 * SPDX-License-Identifier: LGPL-2.1-or-later OR LicenseRef-Liferay-DXP-EULA-2.0.0-2023-06
 */

import {ClayPaginationBarWithBasicItems} from '@clayui/pagination-bar';
import {Fragment, useEffect, useState} from 'react';
import {
	IChangelogIssue,
	IRelease,
	ReleaseNotesError,
} from '~/services/rest/releaseNotes';
import i18n from '~/utils/I18n';

import useChangelog from '../../../../hooks/useChangelog';
import useChangelogComponents from '../../../../hooks/useChangelogComponents';
import {
	paginationDeltas,
	paginationLabels,
} from '../../../../utils/constants/paginationOptions';
import ComponentAutocomplete from '../ComponentAutocomplete/ComponentAutocomplete';
import TabHeader from '../TabHeader/TabHeader';

import './Changelog.css';

type ChangelogProps = {
	from: IRelease;
	to: IRelease;
};

const Changelog = ({from, to}: ChangelogProps) => {
	const [components, setComponents] = useState<string[]>([]);
	const [expandedKeys, setExpandedKeys] = useState<string[]>([]);
	const [keywords, setKeywords] = useState('');
	const [keywordsInput, setKeywordsInput] = useState('');
	const [pageSize, setPageSize] = useState(paginationDeltas[0].label);

	const search = JSON.stringify([
		components,
		from.key,
		keywords,
		pageSize,
		to.key,
	]);

	const [searchPage, setSearchPage] = useState({page: 1, search});

	const page = searchPage.search === search ? searchPage.page : 1;

	const {components: componentOptions} = useChangelogComponents();

	const {changelog, error, loading} = useChangelog({
		components,
		from: from.key,
		keywords,
		page,
		pageSize,
		to: to.key,
	});

	useEffect(() => {
		const timeout = setTimeout(
			() => setKeywords(keywordsInput.trim()),
			500
		);

		return () => clearTimeout(timeout);
	}, [keywordsInput]);

	const filtered = !!keywordsInput || !!components.length;

	const clearFilters = () => {
		setComponents([]);
		setKeywords('');
		setKeywordsInput('');
	};

	const removeComponent = (component: string) =>
		setComponents((previousComponents) =>
			previousComponents.filter(
				(previousComponent) => previousComponent !== component
			)
		);

	const toggleExpanded = (key: string) =>
		setExpandedKeys((previousExpandedKeys) =>
			previousExpandedKeys.includes(key)
				? previousExpandedKeys.filter(
						(previousExpandedKey) => previousExpandedKey !== key
					)
				: [...previousExpandedKeys, key]
		);

	const renderIssue = (issue: IChangelogIssue) => {
		const descriptionId = `changelog-description-${issue.key}`;
		const expanded = expandedKeys.includes(issue.key);

		return (
			<Fragment key={issue.key}>
				<tr>
					<td>
						{issue.description ? (
							<button
								aria-controls={descriptionId}
								aria-expanded={expanded}
								className="btn btn-link btn-unstyled changelog-summary"
								onClick={() => toggleExpanded(issue.key)}
								type="button"
							>
								{issue.summary}
							</button>
						) : (
							issue.summary
						)}
					</td>

					<td>{issue.components.join(', ') || '-'}</td>

					<td>
						{issue.releases.length
							? issue.releases.map((release) => (
									<div key={release}>{release}</div>
								))
							: '-'}
					</td>

					<td className="changelog-key">
						<a
							href={issue.url}
							rel="noopener noreferrer"
							target="_blank"
						>
							{issue.key}
						</a>
					</td>
				</tr>

				{expanded && (
					<tr className="changelog-description-row">
						<td colSpan={4}>
							<div
								className="changelog-description"
								dangerouslySetInnerHTML={{
									__html: issue.description,
								}}
								id={descriptionId}
							/>
						</td>
					</tr>
				)}
			</Fragment>
		);
	};

	const renderResults = () => {
		if (loading) {
			return (
				<span className="cp-spinner ml-2 spinner-border spinner-border-sm"></span>
			);
		}

		if (error || !changelog) {
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

		if (!changelog.total) {
			return (
				<div className="changelog-empty text-center">
					<h3>
						{i18n.translate(
							'no-results-found-to-match-your-selection'
						)}
					</h3>

					<p className="text-secondary">
						{i18n.translate('try-modifying-your-criteria')}
					</p>
				</div>
			);
		}

		return (
			<>
				<p className="text-secondary">
					{i18n.sub(
						changelog.total === 1 ? 'x-result' : 'x-results',
						[String(changelog.total)]
					)}
				</p>

				<div className="table-responsive">
					<table className="changelog-table table table-list">
						<thead>
							<tr>
								<th>{i18n.translate('summary')}</th>
								<th className="changelog-components">
									{i18n.translate('component')}
								</th>
								<th className="changelog-releases">
									{i18n.translate('release')}
								</th>
								<th className="changelog-key">
									{i18n.translate('key')}
								</th>
							</tr>
						</thead>

						<tbody>{changelog.items.map(renderIssue)}</tbody>
					</table>
				</div>

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
		<div className="changelog dxp-release-notes-tab row">
			<div className="changelog-sidebar col-md-3">
				<div className="align-items-center d-flex justify-content-between">
					<h3 className="m-0">{i18n.translate('refine-by')}</h3>

					{filtered && (
						<button
							className="btn btn-link btn-sm"
							onClick={clearFilters}
							type="button"
						>
							{i18n.translate('clear-all')}
						</button>
					)}
				</div>

				<input
					aria-label={i18n.translate('contains-text')}
					className="changelog-keywords form-control"
					onChange={(event) => setKeywordsInput(event.target.value)}
					placeholder={i18n.translate('contains-text')}
					type="text"
					value={keywordsInput}
				/>

				<div className="changelog-filter">
					<label
						className="font-weight-semi-bold"
						htmlFor="changelogComponents"
					>
						{i18n.translate('component')}
					</label>

					<ComponentAutocomplete
						components={componentOptions}
						id="changelogComponents"
						onSelect={(component) =>
							setComponents((previousComponents) => [
								...previousComponents,
								component,
							])
						}
						selectedComponents={components}
					/>

					{!!components.length && (
						<div className="changelog-components-selected">
							{components.map((component) => (
								<div
									className="custom-checkbox custom-control"
									key={component}
								>
									<label>
										<input
											checked
											className="custom-control-input"
											onChange={() =>
												removeComponent(component)
											}
											type="checkbox"
										/>

										<span className="custom-control-label">
											<span className="custom-control-label-text">
												{component}
											</span>
										</span>
									</label>
								</div>
							))}
						</div>
					)}
				</div>
			</div>

			<div className="col-md-9">
				<TabHeader
					description="reference-all-the-fixes-and-improvements-included-in-your-fix-pack-range"
					title="changelog"
				/>

				{renderResults()}
			</div>
		</div>
	);
};

export default Changelog;
