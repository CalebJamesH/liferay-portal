import {ReactNode} from 'react';
import i18n from '~/utils/I18n';

import './SVHeader.css';

type SVHeaderProps = {
	className?: string;
	children: ReactNode;
	description: string;
	title: string;
	icon?: JSX.Element;
};

const SVHeader = ({
	className,
	children,
	description,
	icon,
	title,
}: SVHeaderProps) => {
	return (
		<div className={`${className} d-flex flex-column sv-header`}>
			<span className="sv-header-pill">Updates</span>

			<div className="d-flex align-items-center m-0">
				<span className="align-items-center d-flex sv-header-icon">
					{icon}
				</span>

				<h1 className="sv-header-title m-0 text-neutral-0">
					{i18n.translate(title)}
				</h1>
			</div>

			<div className="sv-header-description">{description}</div>

			{children}
		</div>
	);
};

export default SVHeader;
