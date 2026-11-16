/**
 * SPDX-FileCopyrightText: (c) 2000 Liferay, Inc. https://liferay.com
 * SPDX-License-Identifier: LGPL-2.1-or-later OR LicenseRef-Liferay-DXP-EULA-2.0.0-2023-06
 */

import React, {Suspense} from 'react';

const lazyRoutes = {
	'commerce-release-notes': React.lazy(() => import('./pages/CommerceReleaseNotes/CommerceReleaseNotesRouter')),
	'downloads': React.lazy(() => import('./pages/Downloads/DownloadsRouter')),
	'dxp-release-notes': React.lazy(() => import('./pages/DXPReleaseNotes/DXPReleaseNotesRouter')),
	'security-vulnerabilities': React.lazy(() => import('./pages/security-vulnerabilities/SecurityVulnerabilitiesRouter')),
};

export type RouteType = keyof typeof lazyRoutes;

export default function Routes({path}: {path: RouteType}) {
	const Route = lazyRoutes[path];

	if (!Route) {
		return <h1>Page not found</h1>;
	}

	return (
		<Suspense fallback={<div>Loading...</div>}>
			<Route />
		</Suspense>
	);
}
