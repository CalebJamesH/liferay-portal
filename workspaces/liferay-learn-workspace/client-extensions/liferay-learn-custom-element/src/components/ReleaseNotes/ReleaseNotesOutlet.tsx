/**
 * SPDX-FileCopyrightText: (c) 2026 Liferay, Inc. https://liferay.com
 * SPDX-License-Identifier: LGPL-2.1-or-later OR LicenseRef-Liferay-DXP-EULA-2.0.0-2023-06
 */

import ClayIcon from '@clayui/icon';
import {ReactNode, Suspense, useMemo} from 'react';
import {
	NavLink,
	Outlet,
	useLocation,
	useOutletContext,
	useSearchParams,
} from 'react-router-dom';
import FormsWorkflowsIcon from '~/assets/FormsWorkflowsIcon';
import {SVWaves} from '~/assets/SVWaves';
import {IRelease, ReleaseNotesError} from '~/services/rest/releaseNotes';
import i18n from '~/utils/I18n';

import useReleases from '~/hooks/useReleases';
import EmptyState from './components/EmptyState/EmptyState';
import ReleaseComparison, {
	ReleaseRange,
	getToReleaseGroups,
} from './components/ReleaseComparison/ReleaseComparison';
import Button from '../Button/Button';
import Loading from '../Loading/Loading';

import './ReleaseNotesOutlet.scss';

type ReleaseNotesOutletContext = {
	from: IRelease;
	to: IRelease;
};

type ReleaseNotesOutletProps = {
	productIcon?: ReactNode;
	productLines?: string[];
	title: string;
};

const TABS = [
	{label: 'highlights', path: '/'},
	{label: 'changelog', path: '/changelog'},
	{label: 'module-changes', path: '/module-changes'},
];

const ReleaseNotesOutlet = ({
	productIcon,
	productLines,
	title,
}: ReleaseNotesOutletProps) => {
	const {
		error,
		loading,
		productVersions: releasesProductVersions,
	} = useReleases();
	const location = useLocation();
	const [searchParams, setSearchParams] = useSearchParams();

	const productVersions = useMemo(() => {
		if (!productLines) {
			return releasesProductVersions;
		}

		return releasesProductVersions.filter((productVersion) =>
			productLines.includes(productVersion.line)
		);
	}, [productLines, releasesProductVersions]);

	const {fromRelease, productVersion, toRelease} = useMemo(() => {
		const productVersion = productVersions.find(
			(productVersion) =>
				productVersion.key === searchParams.get('productVersion')
		);

		const fromRelease = productVersion?.releases.find(
			(release) => release.key === searchParams.get('from')
		);

		if (!productVersion || !fromRelease) {
			return {fromRelease, productVersion};
		}

		const toReleases = getToReleaseGroups(
			fromRelease.key,
			productVersions,
			productVersion.key
		).flatMap((releaseGroup) => releaseGroup.releases);

		const toRelease = toReleases.find(
			(release) => release.key === searchParams.get('to')
		);

		return {fromRelease, productVersion, toRelease};
	}, [productVersions, searchParams]);

	const releaseRange: ReleaseRange = {
		from: fromRelease?.key ?? '',
		productVersion: productVersion?.key ?? '',
		to: toRelease?.key ?? '',
	};

	const tabs = (
		<div className="align-items-center c-gap-4 d-flex justify-content-between mb-4">
			<ul className="flex-nowrap mb-0 nav release-notes-tabs">
				{TABS.map(({label, path}) => (
					<li className="nav-item" key={label}>
						<NavLink
							className="font-weight-semi-bold nav-link text-nowrap"
							end
							to={{pathname: path, search: location.search}}
						>
							{i18n.translate(label)}
						</NavLink>
					</li>
				))}
			</ul>

			{toRelease && (
				<Button
					className="align-items-center c-gap-2 d-flex flex-shrink-0 font-weight-semi-bold px-3 py-2 release-notes-get-release"
					onClick={() => {}}
				>
					{`${i18n.translate('get')} ${toRelease.name}`}

					<ClayIcon symbol="arrow-right-full" />
				</Button>
			)}
		</div>
	);

	const updateSearchParams = (params: {[key: string]: string}) => {
		const urlSearchParams = new URLSearchParams(searchParams);

		Object.entries(params).forEach(([key, value]) => {
			if (value) {
				urlSearchParams.set(key, value);
			}
			else {
				urlSearchParams.delete(key);
			}
		});

		setSearchParams(urlSearchParams);
	};

	return (
		<div className="release-notes">
			<div className="overflow-hidden position-relative release-notes-hero">
				<div className="container-fluid container-fluid-max-xl d-flex flex-column release-notes-hero-content">
					<div className="align-items-center c-gap-3 d-flex release-notes-title">
						<span className="align-items-center d-flex flex-shrink-0 justify-content-center release-notes-title-icon">
							<FormsWorkflowsIcon height="48" width="48" />
						</span>

						<h1 className="font-weight-bold m-0 text-white">
							{i18n.translate(title)}
						</h1>
					</div>

					{!error && (
						<ReleaseComparison
							onChange={(releaseRange) =>
								updateSearchParams({...releaseRange})
							}
							productIcon={productIcon}
							productVersions={productVersions}
							releaseRange={releaseRange}
						/>
					)}
				</div>

				<SVWaves
					aria-hidden="true"
					className="release-notes-hero-waves"
					height="398"
					width="398"
				/>
			</div>

			<div className="container-fluid container-fluid-max-xl pb-5 release-notes-body">
				{loading && <Loading />}

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

				{!error &&
					!loading &&
					(fromRelease && toRelease ? (
						<>
							{tabs}

							<Suspense fallback={<Loading />}>
								<Outlet
									context={{from: fromRelease, to: toRelease}}
								/>
							</Suspense>
						</>
					) : (
						<EmptyState
							description="select-a-product-your-version-and-comparison-version-to-get-started"
							title="nothing-to-compare-yet"
						/>
					))}
			</div>
		</div>
	);
};

export function useReleaseNotesContext() {
	return useOutletContext<ReleaseNotesOutletContext>();
}

export default ReleaseNotesOutlet;
