/**
 * SPDX-FileCopyrightText: (c) 2026 Liferay, Inc. https://liferay.com
 * SPDX-License-Identifier: LGPL-2.1-or-later OR LicenseRef-Liferay-DXP-EULA-2.0.0-2023-06
 */

import {ClayInput} from '@clayui/form';
import ClayIcon from '@clayui/icon';
import {forwardRef} from 'react';

import './Input.scss';

type InputProps = React.ComponentPropsWithoutRef<typeof ClayInput> & {
	icon?: string;
	iconClassName?: string;
};

const InputBase = (
	{icon, iconClassName, ...props}: InputProps,
	ref: React.ForwardedRef<HTMLInputElement>
) => {
	if (!icon) {
		return <ClayInput ref={ref} {...props} />;
	}

	return (
		<div className="input-with-icon position-relative">
			<ClayInput ref={ref} {...props} />

			<ClayIcon className={iconClassName} symbol={icon} />
		</div>
	);
};

const Input = forwardRef(InputBase);

export default Input;
