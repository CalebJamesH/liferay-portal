/**
 * SPDX-FileCopyrightText: (c) 2026 Liferay, Inc. https://liferay.com
 * SPDX-License-Identifier: LGPL-2.1-or-later OR LicenseRef-Liferay-DXP-EULA-2.0.0-2023-06
 */

import ClayButton from '@clayui/button';
import {useId, useMemo, useState} from 'react';
import {Download, DownloadFile} from '~/services/rest/downloads';
import i18n from '~/utils/I18n';

import AgreementModal from '../AgreementModal/AgreementModal';
import {useDownloadAgreements} from '~/pages/Downloads/DownloadAgreementsContext';

type FileDownloadsProps = {
	download: Download;
};

const getDetails = (file: DownloadFile) =>
	[
		{label: i18n.translate('size'), value: file.size},
		{label: 'SHA-512', value: file.sha512},
		{label: 'SHA-1', value: file.sha1},
		{label: 'MD5', value: file.md5},
	].filter(({value}) => value);

const FileDownloads = ({download}: FileDownloadsProps) => {
	const {acceptAgreement, isAccepted} = useDownloadAgreements();
	const files = useMemo(
		() => download.fileGroups.flatMap((fileGroup) => fileGroup.files),
		[download.fileGroups]
	);
	const [fileId, setFileId] = useState(files[0]?.id);
	const [showAgreement, setShowAgreement] = useState(false);
	const selectId = useId();

	const file = files.find((file) => file.id === fileId) ?? files[0];

	if (!file) {
		return null;
	}

	const {requiredAgreement} = download;

	const handleDownload = () => {
		if (requiredAgreement && !isAccepted(requiredAgreement)) {
			setShowAgreement(true);

			return;
		}

		window.location.assign(file.url);
	};

	return (
		<div className="downloads-files">
			<div className="align-items-center c-gap-2 d-flex flex-wrap">
				{files.length > 1 && (
					<select
						aria-label={i18n.translate('select-file')}
						className="downloads-file-select form-control"
						id={selectId}
						onChange={(event) =>
							setFileId(Number(event.target.value))
						}
						value={file.id}
					>
						{download.fileGroups.map((fileGroup, index) =>
							fileGroup.name ? (
								<optgroup key={index} label={fileGroup.name}>
									{fileGroup.files.map((groupFile) => (
										<option
											key={groupFile.id}
											value={groupFile.id}
										>
											{groupFile.name}
										</option>
									))}
								</optgroup>
							) : (
								fileGroup.files.map((groupFile) => (
									<option
										key={groupFile.id}
										value={groupFile.id}
									>
										{groupFile.name}
									</option>
								))
							)
						)}
					</select>
				)}

				<ClayButton onClick={handleDownload} size="sm">
					{i18n.translate('download')}
				</ClayButton>
			</div>

			<div className="downloads-file-details mt-2 small text-secondary">
				{files.length === 1 && (
					<span className="font-weight-semi-bold mr-3">
						{file.name}
					</span>
				)}

				{getDetails(file).map(({label, value}) => (
					<span className="mr-3 text-break" key={label}>
						{`${label}: ${value}`}
					</span>
				))}

				{file.otherDetails && (
					<span className="text-break">{file.otherDetails}</span>
				)}
			</div>

			{showAgreement && requiredAgreement && (
				<AgreementModal
					agreementType={requiredAgreement}
					fileName={file.name}
					onAccept={async () => {
						await acceptAgreement(requiredAgreement);

						setShowAgreement(false);

						window.location.assign(file.url);
					}}
					onClose={() => setShowAgreement(false)}
				/>
			)}
		</div>
	);
};

export default FileDownloads;
