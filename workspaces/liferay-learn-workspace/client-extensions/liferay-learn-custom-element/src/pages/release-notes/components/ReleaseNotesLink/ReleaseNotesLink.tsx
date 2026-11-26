/**
 * SPDX-FileCopyrightText: (c) 2026 Liferay, Inc. https://liferay.com
 * SPDX-License-Identifier: LGPL-2.1-or-later OR LicenseRef-Liferay-DXP-EULA-2.0.0-2023-06
 */

import ClayIcon from '@clayui/icon';
import i18n from '~/utils/I18n';

import './ReleaseNotesLink.css';

type ReleaseNotesLinkProps = {
	title: string;
	url: string;
};

const ReleaseNotesLink = ({title, url}: ReleaseNotesLinkProps) => (
	<a className="release-notes-link" href={url}>
		{i18n.translate(title)}

		<ClayIcon symbol="angle-right" />
	</a>
);

export default ReleaseNotesLink;
