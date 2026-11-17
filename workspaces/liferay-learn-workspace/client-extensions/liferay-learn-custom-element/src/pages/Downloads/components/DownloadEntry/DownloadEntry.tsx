/**
 * SPDX-FileCopyrightText: (c) 2026 Liferay, Inc. https://liferay.com
 * SPDX-License-Identifier: LGPL-2.1-or-later OR LicenseRef-Liferay-DXP-EULA-2.0.0-2023-06
 */

import ClayIcon from '@clayui/icon';
import {Link} from 'react-router-dom';
import {Download} from '~/services/rest/downloads';
import i18n from '~/utils/I18n';
import {getFormattedDate} from '~/utils/getFormattedDate';

import FileDownloads from '../FileDownloads/FileDownloads';

type DownloadEntryProps = {
	download: Download;
};

const DownloadEntry = ({download}: DownloadEntryProps) => (
	<li className="border-bottom downloads-entry list-unstyled py-4">
		<div className="c-gap-4 d-flex flex-column flex-md-row">
			<div className="downloads-entry-date flex-shrink-0 text-secondary">
				<span className="sr-only">{i18n.translate('released')}</span>

				{getFormattedDate(
					download.releaseDate,
					'day2DMonthSYearN',
					'UTC'
				)}
			</div>

			<div className="flex-grow-1 min-w-0">
				<h3 className="downloads-entry-title">
					<Link
						to={`/download/${encodeURIComponent(download.urlTitle)}`}
					>
						{download.title}
					</Link>
				</h3>

				{!!download.links.length && (
					<div className="c-gap-3 d-flex downloads-entry-links flex-wrap mb-2">
						{download.links.map((link, index) => (
							<a
								href={link.url}
								key={index}
								rel="noopener noreferrer"
								target="_blank"
							>
								{link.label}
							</a>
						))}
					</div>
				)}

				{download.alertMessage && (
					<div className="alert alert-info c-gap-2 d-flex">
						<ClayIcon className="mt-1" symbol="info-circle" />

						<div>
							<strong>{`${i18n.translate('info')}: `}</strong>

							<span
								dangerouslySetInnerHTML={{
									__html: download.alertMessage,
								}}
							/>
						</div>
					</div>
				)}

				{download.additionalNotes && (
					<div
						className="downloads-entry-notes mb-2"
						dangerouslySetInnerHTML={{
							__html: download.additionalNotes,
						}}
					/>
				)}

				<FileDownloads download={download} />
			</div>
		</div>
	</li>
);

export default DownloadEntry;
