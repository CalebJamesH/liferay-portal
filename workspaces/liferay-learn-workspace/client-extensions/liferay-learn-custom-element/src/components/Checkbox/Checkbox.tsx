/**
 * SPDX-FileCopyrightText: (c) 2026 Liferay, Inc. https://liferay.com
 * SPDX-License-Identifier: LGPL-2.1-or-later OR LicenseRef-Liferay-DXP-EULA-2.0.0-2023-06
 */

import {ClayCheckbox} from '@clayui/form';
import {forwardRef} from 'react';

type CheckboxProps = React.ComponentPropsWithoutRef<typeof ClayCheckbox>;

const CheckboxBase = (
	props: CheckboxProps,
	ref: React.ForwardedRef<HTMLInputElement>
) => {
	return <ClayCheckbox ref={ref} {...props} />;
};

const Checkbox = forwardRef(CheckboxBase);

export default Checkbox;
