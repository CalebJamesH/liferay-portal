/**
 * SPDX-FileCopyrightText: (c) 2026 Liferay, Inc. https://liferay.com
 * SPDX-License-Identifier: LGPL-2.1-or-later OR LicenseRef-Liferay-DXP-EULA-2.0.0-2023-06
 */

import ClayLoadingIndicator from '@clayui/loading-indicator';
import classNames from 'classnames';
import {ComponentPropsWithoutRef} from 'react';

import './Loading.scss';

type LoadingProps = ComponentPropsWithoutRef<typeof ClayLoadingIndicator>;

const Loading = ({
	className,
	displayType = 'primary',
	shape = 'squares',
	size = 'lg',
	...props
}: LoadingProps) => (
	<div className={classNames('learn-loading pt-6', className)}>
		<ClayLoadingIndicator
			displayType={displayType}
			shape={shape}
			size={size}
			{...props}
		/>
	</div>
);

export default Loading;
