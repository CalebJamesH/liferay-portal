/**
 * SPDX-FileCopyrightText: (c) 2026 Liferay, Inc. https://liferay.com
 * SPDX-License-Identifier: LGPL-2.1-or-later OR LicenseRef-Liferay-DXP-EULA-2.0.0-2023-06
 */

import {Suspense, lazy} from 'react';
import {
	HashRouter,
	Navigate,
	Route,
	Routes,
	useLocation,
	useOutletContext,
} from 'react-router-dom';

import ReleaseNotes, {
	ReleaseNotesOutletContext,
} from '../release-notes/ReleaseNotes/ReleaseNotes';
import EmptyTab from '../release-notes/components/EmptyTab/EmptyTab';

const ModuleChanges = lazy(
	() => import('../release-notes/components/ModuleChanges/ModuleChanges')
);

const OWNER_OPTIONS = [{label: 'commerce-artifacts', value: 'commerce'}];

const PRODUCT_LINES = ['7.3', '7.4'];

const RELATED_RELEASE_NOTES = {
	title: 'liferay-dxp-release-notes',
	url: '/dxp-release-notes',
};

const ModuleChangesRoute = () => {
	const {fromRelease, toRelease} =
		useOutletContext<ReleaseNotesOutletContext>();

	return (
		<Suspense
			fallback={
				<span className="cp-spinner ml-2 spinner-border spinner-border-sm"></span>
			}
		>
			<ModuleChanges
				from={fromRelease}
				ownerOptions={OWNER_OPTIONS}
				to={toRelease}
			/>
		</Suspense>
	);
};

const RedirectToHighlights = () => {
	const location = useLocation();

	return <Navigate replace to={{pathname: '/', search: location.search}} />;
};

const CommerceReleaseNotesRoutes = () => {
	return (
		<HashRouter>
			<Routes>
				<Route
					element={
						<ReleaseNotes
							productLines={PRODUCT_LINES}
							relatedReleaseNotes={RELATED_RELEASE_NOTES}
							title="liferay-commerce-release-notes"
						/>
					}
					path="/"
				>
					<Route
						element={
							<EmptyTab
								description="the-following-information-summarizes-the-important-changes-known-issues-and-security-details-in-each-release"
								title="highlights"
							/>
						}
						index
					/>

					<Route
						element={
							<EmptyTab
								description="reference-all-the-fixes-and-improvements-included-in-your-fix-pack-range"
								title="changelog"
							/>
						}
						path="changelog"
					/>

					<Route
						element={<ModuleChangesRoute />}
						path="module-changes"
					/>

					<Route element={<RedirectToHighlights />} path="*" />
				</Route>
			</Routes>
		</HashRouter>
	);
};

export default CommerceReleaseNotesRoutes;
