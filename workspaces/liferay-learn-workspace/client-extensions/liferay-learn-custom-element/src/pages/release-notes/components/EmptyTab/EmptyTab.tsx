/**
 * SPDX-FileCopyrightText: (c) 2026 Liferay, Inc. https://liferay.com
 * SPDX-License-Identifier: LGPL-2.1-or-later OR LicenseRef-Liferay-DXP-EULA-2.0.0-2023-06
 */

import i18n from '~/utils/I18n';

import TabHeader from '../TabHeader/TabHeader';

import './EmptyTab.css';

type EmptyTabProps = {
	description: string;
	title: string;
};

const EmptyTab = ({description, title}: EmptyTabProps) => (
	<div className="release-notes-tab">
		<TabHeader description={description} title={title} />

		<div className="empty-tab text-center">
			<h3>
				{i18n.translate('no-results-found-to-match-your-selection')}
			</h3>

			<p className="text-secondary">
				{i18n.translate('try-modifying-your-criteria')}
			</p>
		</div>
	</div>
);

export default EmptyTab;
