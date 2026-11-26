/**
 * SPDX-FileCopyrightText: (c) 2026 Liferay, Inc. https://liferay.com
 * SPDX-License-Identifier: LGPL-2.1-or-later OR LicenseRef-Liferay-DXP-EULA-2.0.0-2023-06
 */

import {HashRouter, Navigate, Route, Routes} from 'react-router-dom';
import {DownloadAgreementsProvider} from './DownloadAgreementsContext';
import DownloadView from './DownloadView/DownloadView';
import DownloadsList from './DownloadsList/DownloadsList';

import './Downloads.scss';

const DownloadsRouter = () => (
	<DownloadAgreementsProvider>
		<HashRouter>
			<Routes>
				<Route element={<DownloadsList />} index />

				<Route element={<DownloadView />} path="download/:urlTitle" />

				<Route element={<Navigate replace to="/" />} path="*" />
			</Routes>
		</HashRouter>
	</DownloadAgreementsProvider>
);

export default DownloadsRouter;
