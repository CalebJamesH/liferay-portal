/**
 * SPDX-FileCopyrightText: (c) 2000 Liferay, Inc. https://liferay.com
 * SPDX-License-Identifier: LGPL-2.1-or-later OR LicenseRef-Liferay-DXP-EULA-2.0.0-2023-06
 */

import React, {Suspense} from 'react';

const lazyRoutes = {
	'certification-list': React.lazy(() => import('./components/Certification/CertificationList')),
	'commerce-release-notes': React.lazy(() => import('./pages/commerce-release-notes/commerceReleaseNotes.routes')),
	'course-list': React.lazy(() => import('./components/Course/CoursesList')),
	'dxp-release-notes': React.lazy(() => import('./pages/dxp-release-notes/dxpReleaseNotes.routes')),
	'landing-page-view': React.lazy(() => import('./components/LandingPageView')),
	'learning-path-list': React.lazy(() => import('./components/LearningPath/LearningPathList')),
	'security-vulnerabilities': React.lazy(() => import('./pages/security-vulnerabilities/securityVulnerabilities.routes')),
};

export default function Routes({path, properties}) {
	console.log(path, properties)

	const Route = lazyRoutes[path];

	if (!Route) {
		return <h1>Page not found</h1>;
	}

	return (
		<Suspense fallback={<div>Loading...</div>}>
		  <Route properties={properties} />
		</Suspense>
	  );
}