/**
 * SPDX-FileCopyrightText: (c) 2026 Liferay, Inc. https://liferay.com
 * SPDX-License-Identifier: LGPL-2.1-or-later OR LicenseRef-Liferay-DXP-EULA-2.0.0-2023-06
 */

import classNames from 'classnames';
import {ReactNode} from 'react';
import {ReleaseNotesError} from '~/services/rest/releaseNotes';
import i18n from '~/utils/I18n';

import Loading from '~/components/Loading/Loading';

import './TabResults.scss';

type TabResultsProps<T> = {
	children: (data: T) => ReactNode;
	data?: T;
	error?: Error;
	loading: boolean;
	notFoundMessage?: string;
};

function TabResults<T>({
	children,
	data,
	error,
	loading,
	notFoundMessage,
}: TabResultsProps<T>) {
	if (loading && !data) {
		return <Loading />;
	}

	if (error || !data) {
		let message = 'an-unexpected-error-occurred';

		if (error instanceof ReleaseNotesError) {
			if (error.status === 401 || error.status === 403) {
				message =
					'you-do-not-have-permission-to-access-the-requested-resource';
			}
			else if (error.status === 404 && notFoundMessage) {
				message = notFoundMessage;
			}
		}

		return (
			<div className="alert alert-warning">{i18n.translate(message)}</div>
		);
	}

	return (
		<div
			aria-busy={loading}
			className={classNames('release-notes-tab-results', {
				'release-notes-tab-results-refreshing': loading,
			})}
		>
			{children(data)}
		</div>
	);
}

export default TabResults;
