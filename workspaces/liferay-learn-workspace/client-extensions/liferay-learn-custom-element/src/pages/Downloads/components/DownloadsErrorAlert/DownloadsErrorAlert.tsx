/**
 * SPDX-FileCopyrightText: (c) 2026 Liferay, Inc. https://liferay.com
 * SPDX-License-Identifier: LGPL-2.1-or-later OR LicenseRef-Liferay-DXP-EULA-2.0.0-2023-06
 */

import {DownloadsError} from '~/services/rest/downloads';
import i18n from '~/utils/I18n';

type DownloadsErrorAlertProps = {
	error: Error;
};

const DownloadsErrorAlert = ({error}: DownloadsErrorAlertProps) => {
	const downloadsError = error instanceof DownloadsError ? error : null;

	if (downloadsError?.status === 403 && downloadsError.subscriptionURL) {
		return (
			<div className="alert alert-warning">
				{i18n.translate(
					'downloads-are-available-to-liferay-subscribers'
				)}{' '}
				<a href={downloadsError.subscriptionURL}>
					{i18n.translate('learn-about-liferay-subscriptions')}
				</a>
			</div>
		);
	}

	const unauthorized =
		downloadsError?.status === 401 || downloadsError?.status === 403;

	return (
		<div className="alert alert-warning">
			{i18n.translate(
				unauthorized
					? 'you-do-not-have-permission-to-access-the-requested-resource'
					: 'an-unexpected-error-occurred'
			)}
		</div>
	);
};

export default DownloadsErrorAlert;
