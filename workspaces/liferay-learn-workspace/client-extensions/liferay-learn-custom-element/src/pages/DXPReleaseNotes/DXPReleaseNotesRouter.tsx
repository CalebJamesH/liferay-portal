/**
 * SPDX-FileCopyrightText: (c) 2026 Liferay, Inc. https://liferay.com
 * SPDX-License-Identifier: LGPL-2.1-or-later OR LicenseRef-Liferay-DXP-EULA-2.0.0-2023-06
 */

import {HashRouter, Route, Routes} from 'react-router-dom';
import DXPGlassIcon from '~/assets/DXPGlassIcon';

import ReleaseNotesOutlet from '~/components/ReleaseNotes/ReleaseNotesOutlet';
import RedirectToHighlights from '~/components/ReleaseNotes/components/RedirectToHighlights/RedirectToHighlights';
import Changelog from '../../components/ReleaseNotes/components/Changelog/Changelog';
import Highlights from '../../components/ReleaseNotes/components/Highlights/Highlights';
import ModuleChanges from '~/components/ReleaseNotes/components/ModuleChanges/ModuleChanges';

const OWNERS = [
	{label: 'liferay-artifacts', value: 'liferay'},
	{label: 'third-party-libraries', value: 'third-party'},
];

const DXPReleaseNotesRoutes = () => {
	return (
		<HashRouter>
			<Routes>
				<Route
					element={
						<ReleaseNotesOutlet
							productIcon={<DXPGlassIcon />}
							title="version-comparison-tool"
						/>
					}
					path="/"
				>
					<Route element={<Highlights />} index />

					<Route element={<Changelog />} path="changelog" />

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

export default DXPReleaseNotesRoutes;
