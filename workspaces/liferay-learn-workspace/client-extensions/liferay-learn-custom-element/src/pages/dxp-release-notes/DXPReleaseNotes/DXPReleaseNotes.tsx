/**
 * SPDX-FileCopyrightText: (c) 2026 Liferay, Inc. https://liferay.com
 * SPDX-License-Identifier: LGPL-2.1-or-later OR LicenseRef-Liferay-DXP-EULA-2.0.0-2023-06
 */

import {useMemo} from 'react';
import {NavLink, Outlet, useLocation, useSearchParams} from 'react-router-dom';
import {IRelease, ReleaseNotesError} from '~/services/rest/releaseNotes';
import i18n from '~/utils/I18n';

import useReleases from '../../../hooks/useReleases';
import ReleaseRangeFilters, {
	ReleaseRange,
	getToReleaseGroups,
} from '../../release-notes/components/ReleaseRangeFilters/ReleaseRangeFilters';

import './DXPReleaseNotes.css';

export type ReleaseNotesOutletContext = {
	fromRelease: IRelease;
	toRelease: IRelease;
};

const TABS = [
	{label: 'highlights', path: '/'},
	{label: 'changelog', path: '/changelog'},
	{label: 'module-changes', path: '/module-changes'},
];

const DXPReleaseNotes = () => {
	const {error, loading, productVersions} = useReleases();
	const location = useLocation();
	const [searchParams, setSearchParams] = useSearchParams();

	const releaseRange = useMemo<ReleaseRange>(() => {
		const productVersion = productVersions.find(
			(productVersion) =>
				productVersion.key === searchParams.get('productVersion')
		);

		if (!productVersion) {
			return {from: '', productVersion: '', to: ''};
		}

		const fromParam = searchParams.get('from');

		const from =
			productVersion.releases.find((release) => release.key === fromParam)
				?.key ?? '';

		const to =
			getToReleaseGroups(productVersions, productVersion.key, from)
				.flatMap((releaseGroup) => releaseGroup.releases)
				.find((release) => release.key === searchParams.get('to'))
				?.key ?? '';

		return {from, productVersion: productVersion.key, to};
	}, [productVersions, searchParams]);

	const [fromRelease, toRelease] = useMemo(() => {
		const releases = productVersions.flatMap(
			(productVersion) => productVersion.releases
		);

		return [
			releases.find((release) => release.key === releaseRange.from),
			releases.find((release) => release.key === releaseRange.to),
		];
	}, [productVersions, releaseRange]);

	const tabs = (
		<ul className="dxp-release-notes-tabs nav nav-tabs">
			{TABS.map(({label, path}) => (
				<li className="nav-item" key={label}>
					<NavLink
						className={({isActive}) =>
							`nav-link${isActive ? ' active' : ''}`
						}
						end
						to={{pathname: path, search: location.search}}
					>
						{i18n.translate(label)}
					</NavLink>
				</li>
			))}
		</ul>
	);

	const updateSearchParams = (params: {[key: string]: string}) => {
		const newSearchParams = new URLSearchParams(searchParams);

		Object.entries(params).forEach(([key, value]) => {
			if (value) {
				newSearchParams.set(key, value);
			}
			else {
				newSearchParams.delete(key);
			}
		});

		setSearchParams(newSearchParams);
	};

	return (
		<div className="container-fluid container-fluid-max-xl dxp-release-notes">
			<div className="dxp-release-notes-header">
				<h1>{i18n.translate('liferay-dxp-release-notes')}</h1>

				<p className="text-secondary">
					{i18n.translate(
						'display-the-fix-pack-information-relevant-to-your-liferay-build'
					)}
				</p>
			</div>

			{loading && (
				<span className="cp-spinner ml-2 spinner-border spinner-border-sm"></span>
			)}

			{error &&
				(() => {
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
				})()}

			{!error && !loading && (
				<>
					<ReleaseRangeFilters
						onChange={(releaseRange) =>
							updateSearchParams({...releaseRange})
						}
						productVersions={productVersions}
						releaseRange={releaseRange}
					/>

					{fromRelease && toRelease ? (
						<>
							{tabs}

							<Outlet context={{fromRelease, toRelease}} />
						</>
					) : (
						<div className="dxp-release-notes-empty text-center text-secondary">
							{i18n.translate(
								'content-collection-is-empty-select-your-settings-above-to-show-details'
							)}
						</div>
					)}
				</>
			)}
		</div>
	);
};

export default DXPReleaseNotes;
