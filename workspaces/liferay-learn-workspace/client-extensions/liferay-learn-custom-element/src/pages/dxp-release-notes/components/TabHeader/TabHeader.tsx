/**
 * SPDX-FileCopyrightText: (c) 2026 Liferay, Inc. https://liferay.com
 * SPDX-License-Identifier: LGPL-2.1-or-later OR LicenseRef-Liferay-DXP-EULA-2.0.0-2023-06
 */

import i18n from '~/utils/I18n';

import './TabHeader.css';

type TabHeaderProps = {
	description: string;
	title: string;
};

const TabHeader = ({description, title}: TabHeaderProps) => (
	<div className="dxp-release-notes-tab-header">
		<h2>{i18n.translate(title)}</h2>

		<p className="dxp-release-notes-tab-header-description text-secondary">
			{i18n.translate(description)}
		</p>
	</div>
);

export default TabHeader;
