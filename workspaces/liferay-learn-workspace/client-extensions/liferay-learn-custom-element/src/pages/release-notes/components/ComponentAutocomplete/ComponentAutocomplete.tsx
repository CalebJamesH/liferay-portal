/**
 * SPDX-FileCopyrightText: (c) 2026 Liferay, Inc. https://liferay.com
 * SPDX-License-Identifier: LGPL-2.1-or-later OR LicenseRef-Liferay-DXP-EULA-2.0.0-2023-06
 */

import ClayAutocomplete from '@clayui/autocomplete';
import {MouseEvent, useMemo, useState} from 'react';
import i18n from '~/utils/I18n';

type ComponentItem = {
	name: string;
};

type ComponentAutocompleteProps = {
	components: string[];
	id: string;
	onSelect: (component: string) => void;
	selectedComponents: string[];
};

const ComponentAutocomplete = ({
	components,
	id,
	onSelect,
	selectedComponents,
}: ComponentAutocompleteProps) => {
	const [active, setActive] = useState(false);
	const [inputValue, setInputValue] = useState('');

	const componentItems = useMemo<ComponentItem[]>(() => {
		const query = inputValue.toLowerCase();

		return components
			.filter(
				(component) =>
					!selectedComponents.includes(component) &&
					component.toLowerCase().includes(query)
			)
			.map((component) => ({name: component}));
	}, [components, inputValue, selectedComponents]);

	if (!components.length) {
		return (
			<input
				className="form-control"
				disabled
				id={id}
				placeholder={i18n.translate('search')}
				type="text"
			/>
		);
	}

	return (
		<ClayAutocomplete
			active={active}
			filterKey="name"
			id={id}
			items={componentItems}
			menuTrigger="focus"
			messages={{
				loading: i18n.translate('loading'),
				notFound: i18n.translate('no-results-found'),
			}}
			onActiveChange={setActive}
			onChange={setInputValue}
			onItemsChange={() => {}}
			placeholder={i18n.translate('search')}
			value={inputValue}
		>
			{(componentItem: ComponentItem) => (
				<ClayAutocomplete.Item
					key={componentItem.name}
					onClick={(event: MouseEvent) => {
						event.preventDefault();

						onSelect(componentItem.name);

						setActive(false);
						setInputValue('');
					}}
					textValue={componentItem.name}
				>
					{componentItem.name}
				</ClayAutocomplete.Item>
			)}
		</ClayAutocomplete>
	);
};

export default ComponentAutocomplete;
