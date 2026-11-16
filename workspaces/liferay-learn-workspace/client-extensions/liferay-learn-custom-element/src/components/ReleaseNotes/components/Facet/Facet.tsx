/**
 * SPDX-FileCopyrightText: (c) 2026 Liferay, Inc. https://liferay.com
 * SPDX-License-Identifier: LGPL-2.1-or-later OR LicenseRef-Liferay-DXP-EULA-2.0.0-2023-06
 */

import ClayIcon from '@clayui/icon';
import {ReactNode, useState} from 'react';
import Button from '~/components/Button/Button';
import i18n from '~/utils/I18n';

import './Facet.scss';

type FacetProps = {
	children: ReactNode;
	clearDisabled?: boolean;
	collapsible?: boolean;
	id: string;
	onClear?: () => void;
	onSelectAll?: () => void;
	selectAllDisabled?: boolean;
	title: string;
};

const Facet = ({
	children,
	clearDisabled = false,
	collapsible = false,
	id,
	onClear,
	onSelectAll,
	selectAllDisabled = false,
	title,
}: FacetProps) => {
	const [expanded, setExpanded] = useState(true);

	const bodyId = `${id}-body`;

	return (
		<section className="bg-neutral-1 c-gap-3 d-flex flex-column p-3 release-notes-facet">
			<div className="align-items-start c-gap-2 d-flex justify-content-between">
				<div className="c-gap-2 d-flex flex-column">
					<h3 className="font-weight-semi-bold m-0 release-notes-facet-title text-5 text-neutral-10">
						{i18n.translate(title)}
					</h3>

					{(onClear || onSelectAll) && (
						<div className="c-gap-2 d-flex">
							{onSelectAll && (
								<Button
									className="font-weight-semi-bold p-0 release-notes-facet-link text-decoration-underline"
									disabled={selectAllDisabled}
									displayType="unstyled"
									onClick={onSelectAll}
								>
									{i18n.translate('select-all')}
								</Button>
							)}

							{onClear && (
								<Button
									className="font-weight-semi-bold p-0 release-notes-facet-link text-decoration-underline"
									disabled={clearDisabled}
									displayType="unstyled"
									onClick={onClear}
								>
									{i18n.translate('clear')}
								</Button>
							)}
						</div>
					)}
				</div>

				{collapsible && (
					<Button
						aria-controls={bodyId}
						aria-expanded={expanded}
						aria-label={i18n.translate(title)}
						className="align-items-center d-flex flex-shrink-0 justify-content-center p-2 release-notes-facet-toggle rounded-sm"
						displayType="unstyled"
						onClick={() => setExpanded(!expanded)}
					>
						<ClayIcon
							symbol={
								expanded ? 'angle-up-small' : 'angle-down-small'
							}
						/>
					</Button>
				)}
			</div>

			{expanded && (
				<div
					className="d-flex flex-column release-notes-facet-body"
					id={bodyId}
				>
					{children}
				</div>
			)}
		</section>
	);
};

export default Facet;
