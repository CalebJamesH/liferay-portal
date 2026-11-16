/**
 * SPDX-FileCopyrightText: (c) 2026 Liferay, Inc. https://liferay.com
 * SPDX-License-Identifier: LGPL-2.1-or-later OR LicenseRef-Liferay-DXP-EULA-2.0.0-2023-06
 */

import TelescopeIllustration from '~/assets/TelescopeIllustration';
import i18n from '~/utils/I18n';

import './EmptyState.scss';

type EmptyStateProps = {
	description: string;
	title: string;
};

const EmptyState = ({description, title}: EmptyStateProps) => (
	<div className="align-items-center c-gap-1 d-flex flex-column release-notes-empty-state text-center">
		<TelescopeIllustration className="d-block h-auto mw-100 release-notes-illustration" />

		<h2 className="font-weight-bold m-0 release-notes-empty-state-title text-7">
			{i18n.translate(title)}
		</h2>

		<p className="m-0 release-notes-empty-state-description">
			{i18n.translate(description)}
		</p>
	</div>
);

export default EmptyState;
