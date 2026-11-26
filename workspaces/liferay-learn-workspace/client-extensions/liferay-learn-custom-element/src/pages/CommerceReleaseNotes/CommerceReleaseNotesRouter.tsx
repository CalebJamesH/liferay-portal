/**
 * SPDX-FileCopyrightText: (c) 2026 Liferay, Inc. https://liferay.com
 * SPDX-License-Identifier: LGPL-2.1-or-later OR LicenseRef-Liferay-DXP-EULA-2.0.0-2023-06
 */

import {HashRouter, Route, Routes} from 'react-router-dom';

import ReleaseNotesOutlet from '~/components/ReleaseNotes/ReleaseNotesOutlet';
import EmptyTab from '~/components/ReleaseNotes/components/EmptyTab/EmptyTab';
import ModuleChanges from '~/components/ReleaseNotes/components/ModuleChanges/ModuleChanges';
import RedirectToHighlights from '~/components/ReleaseNotes/components/RedirectToHighlights/RedirectToHighlights';

const OWNERS = [{label: 'commerce-artifacts', value: 'commerce'}];
const PRODUCT_LINES = ['7.3', '7.4'];

const CommerceReleaseNotesRoutes = () => {
	return (
		<HashRouter>
			<Routes>
				<Route
					element={
						<ReleaseNotesOutlet
							productLines={PRODUCT_LINES}
							title="version-comparison-tool"
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
						element={<ModuleChanges owners={OWNERS} />}
						path="module-changes"
					/>

					<Route element={<RedirectToHighlights />} path="*" />
				</Route>
			</Routes>
		</HashRouter>
	);
};

export default CommerceReleaseNotesRoutes;
