/**
 * SPDX-FileCopyrightText: (c) 2026 Liferay, Inc. https://liferay.com
 * SPDX-License-Identifier: LGPL-2.1-or-later OR LicenseRef-Liferay-DXP-EULA-2.0.0-2023-06
 */

import EmptyState from '../EmptyState/EmptyState';
import TabHeader from '../TabHeader/TabHeader';

type EmptyTabProps = {
	description: string;
	title: string;
};

const EmptyTab = ({description, title}: EmptyTabProps) => (
	<div className="release-notes-tab-main">
		<TabHeader description={description} title={title} />

		<EmptyState
			description="try-modifying-your-criteria"
			title="no-results-found-to-match-your-selection"
		/>
	</div>
);

export default EmptyTab;
