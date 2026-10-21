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

import DXPReleaseNotes, {
	ReleaseNotesOutletContext,
} from './DXPReleaseNotes/DXPReleaseNotes';
import Highlights from './components/Highlights/Highlights';

const ModuleChanges = lazy(
	() => import('./components/ModuleChanges/ModuleChanges')
);

const HighlightsRoute = () => {
	const {fromRelease, toRelease} =
		useOutletContext<ReleaseNotesOutletContext>();

	return <Highlights from={fromRelease} to={toRelease} />;
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
			<ModuleChanges from={fromRelease} to={toRelease} />
		</Suspense>
	);
};

const RedirectToHighlights = () => {
	const location = useLocation();

	return <Navigate replace to={{pathname: '/', search: location.search}} />;
};

const DXPReleaseNotesRoutes = () => {
	return (
		<HashRouter>
			<Routes>
				<Route element={<DXPReleaseNotes />} path="/">
					<Route element={<HighlightsRoute />} index />

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

export default DXPReleaseNotesRoutes;
