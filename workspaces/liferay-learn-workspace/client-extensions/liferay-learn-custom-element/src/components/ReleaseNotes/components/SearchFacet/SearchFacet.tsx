/**
 * SPDX-FileCopyrightText: (c) 2026 Liferay, Inc. https://liferay.com
 * SPDX-License-Identifier: LGPL-2.1-or-later OR LicenseRef-Liferay-DXP-EULA-2.0.0-2023-06
 */

import i18n from '~/utils/I18n';

import Input from '~/components/Input/Input';

import Facet from '../Facet/Facet';

type SearchFacetProps = {
	id: string;
	onChange: (value: string) => void;
	value: string;
};

const SearchFacet = ({id, onChange, value}: SearchFacetProps) => (
	<Facet id={id} title="search">
		<Input
			aria-label={i18n.translate('search-by-keywords')}
			icon="search"
			onChange={(event) => onChange(event.target.value)}
			placeholder={i18n.translate('search-by-keywords')}
			value={value}
		/>
	</Facet>
);

export default SearchFacet;
