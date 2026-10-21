/**
 * SPDX-FileCopyrightText: (c) 2026 Liferay, Inc. https://liferay.com
 * SPDX-License-Identifier: LGPL-2.1-or-later OR LicenseRef-Liferay-DXP-EULA-2.0.0-2023-06
 */

import {ClayPaginationBarWithBasicItems} from '@clayui/pagination-bar';
import {useEffect, useMemo, useState} from 'react';
import {
	IModuleChange,
	IRelease,
	ReleaseNotesError,
} from '~/services/rest/releaseNotes';
import i18n from '~/utils/I18n';

import useModuleChanges from '../../../../hooks/useModuleChanges';
import {
	paginationDeltas,
	paginationLabels,
} from '../../../../utils/constants/paginationOptions';
import TabHeader from '../TabHeader/TabHeader';

import './ModuleChanges.css';

type ModuleChangesProps = {
	from: IRelease;
	ownerOptions: {label: string; value: string}[];
	to: IRelease;
};

const VersionLink = ({url, version}: {url?: string; version?: string}) => {
	if (!version) {
		return <>-</>;
	}

	if (!url) {
		return <>{version}</>;
	}

	return (
		<a href={url} rel="noopener noreferrer" target="_blank">
			{version}
		</a>
	);
};

const ModuleChanges = ({from, ownerOptions, to}: ModuleChangesProps) => {
	const [changesOnly, setChangesOnly] = useState(false);
	const [keywords, setKeywords] = useState('');
	const [keywordsInput, setKeywordsInput] = useState('');
	const [owners, setOwners] = useState<string[]>([]);
	const [page, setPage] = useState(1);
	const [pageSize, setPageSize] = useState(paginationDeltas[0].label);

	const {error, loading, moduleChanges} = useModuleChanges({
		changesOnly,
		from: from.key,
		keywords,
		owners: owners.length
			? owners
			: ownerOptions.map((ownerOption) => ownerOption.value),
		to: to.key,
	});

	useEffect(() => {
		const timeout = setTimeout(() => setKeywords(keywordsInput), 500);

		return () => clearTimeout(timeout);
	}, [keywordsInput]);

	useEffect(() => {
		setPage(1);
	}, [changesOnly, from.key, keywords, owners, to.key]);

	const pageItems = useMemo<IModuleChange[]>(
		() =>
			moduleChanges?.items.slice(
				(page - 1) * pageSize,
				page * pageSize
			) ?? [],
		[moduleChanges, page, pageSize]
	);

	const filtered = changesOnly || !!keywordsInput || !!owners.length;

	const clearFilters = () => {
		setChangesOnly(false);
		setKeywords('');
		setKeywordsInput('');
		setOwners([]);
	};

	const toggleOwner = (owner: string) =>
		setOwners((previousOwners) =>
			previousOwners.includes(owner)
				? previousOwners.filter(
						(previousOwner) => previousOwner !== owner
					)
				: [...previousOwners, owner]
		);

	const renderResults = () => {
		if (loading) {
			return (
				<span className="cp-spinner ml-2 spinner-border spinner-border-sm"></span>
			);
		}

		if (error || !moduleChanges) {
			const unavailable =
				error instanceof ReleaseNotesError && error.status === 404;

			return (
				<div className="alert alert-warning">
					{i18n.translate(
						unavailable
							? 'module-changes-are-not-available-for-the-selected-releases'
							: 'an-unexpected-error-occurred'
					)}
				</div>
			);
		}

		if (!moduleChanges.total) {
			return (
				<div className="module-changes-empty text-center">
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
						moduleChanges.total === 1 ? 'x-result' : 'x-results',
						[String(moduleChanges.total)]
					)}
				</p>

				<div className="table-responsive">
					<table className="module-changes-table table table-autofit table-list">
						<thead>
							<tr>
								<th>{i18n.translate('name')}</th>
								<th>{i18n.translate('group')}</th>
								<th>{from.name}</th>
								<th>{to.name}</th>
							</tr>
						</thead>

						<tbody>
							{pageItems.map((moduleChange) => (
								<tr
									className={
										moduleChange.fromVersion !==
										moduleChange.toVersion
											? 'module-changes-changed'
											: ''
									}
									key={`${moduleChange.group}:${moduleChange.name}`}
								>
									<td className="table-cell-expand">
										{moduleChange.name}
									</td>

									<td>{moduleChange.group}</td>

									<td>
										<VersionLink
											url={moduleChange.fromURL}
											version={moduleChange.fromVersion}
										/>
									</td>

									<td>
										<VersionLink
											url={moduleChange.toURL}
											version={moduleChange.toVersion}
										/>
									</td>
								</tr>
							))}
						</tbody>
					</table>
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
					totalItems={moduleChanges.total}
				/>
			</>
		);
	};

	return (
		<div className="module-changes row">
			<div className="col-md-3 module-changes-sidebar">
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
					aria-label={i18n.translate('name')}
					className="form-control module-changes-keywords"
					onChange={(event) => setKeywordsInput(event.target.value)}
					placeholder={i18n.translate('name')}
					type="text"
					value={keywordsInput}
				/>

				<div className="module-changes-filter">
					<div className="font-weight-semi-bold">
						{i18n.translate('group')}
					</div>

					{ownerOptions.map((ownerOption) => (
						<div
							className="custom-checkbox custom-control"
							key={ownerOption.value}
						>
							<label>
								<input
									checked={owners.includes(ownerOption.value)}
									className="custom-control-input"
									onChange={() =>
										toggleOwner(ownerOption.value)
									}
									type="checkbox"
								/>

								<span className="custom-control-label">
									<span className="custom-control-label-text">
										{i18n.translate(ownerOption.label)}
									</span>
								</span>
							</label>
						</div>
					))}
				</div>

				<div className="module-changes-filter">
					<div className="font-weight-semi-bold">
						{i18n.translate('only-show')}
					</div>

					<label className="toggle-switch">
						<input
							checked={changesOnly}
							className="toggle-switch-check"
							onChange={(event) =>
								setChangesOnly(event.target.checked)
							}
							role="switch"
							type="checkbox"
						/>

						<span aria-hidden="true" className="toggle-switch-bar">
							<span className="toggle-switch-handle"></span>
						</span>

						<span className="toggle-switch-text toggle-switch-text-right">
							{i18n.translate('changes')}
						</span>
					</label>
				</div>
			</div>

			<div className="col-md-9">
				<TabHeader
					description="reference-the-bundle-or-module-version-you-should-compile-against"
					title="module-version-changes"
				/>

				{renderResults()}
			</div>
		</div>
	);
};

export default ModuleChanges;
