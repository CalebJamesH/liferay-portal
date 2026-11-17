/**
 * SPDX-FileCopyrightText: (c) 2026 Liferay, Inc. https://liferay.com
 * SPDX-License-Identifier: LGPL-2.1-or-later OR LicenseRef-Liferay-DXP-EULA-2.0.0-2023-06
 */

import ClayButton from '@clayui/button';
import {ClayCheckbox} from '@clayui/form';
import ClayIcon from '@clayui/icon';
import {useCallback, useEffect, useId, useState} from 'react';
import useDownloadsRequest from '~/hooks/useDownloadsRequest';
import {AgreementType, getAgreementContent} from '~/services/rest/downloads';
import i18n from '~/utils/I18n';

import Loading from '~/components/Loading/Loading';

type AgreementModalProps = {
	agreementType: AgreementType;
	fileName: string;
	onAccept: () => Promise<void>;
	onClose: () => void;
};

const AgreementModal = ({
	agreementType,
	fileName,
	onAccept,
	onClose,
}: AgreementModalProps) => {
	const [accepted, setAccepted] = useState(false);
	const [submitting, setSubmitting] = useState(false);
	const titleId = useId();

	const request = useCallback(
		() => getAgreementContent(agreementType),
		[agreementType]
	);

	const {data: content, error, loading} = useDownloadsRequest(request);

	useEffect(() => {
		const onKeyDown = (event: KeyboardEvent) => {
			if (event.key === 'Escape') {
				onClose();
			}
		};

		document.addEventListener('keydown', onKeyDown);

		return () => document.removeEventListener('keydown', onKeyDown);
	}, [onClose]);

	const handleAccept = async () => {
		setSubmitting(true);

		try {
			await onAccept();
		}
		catch (error) {
			console.error('Error accepting agreement:', error);
		}

		setSubmitting(false);
	};

	return (
		<>
			<div className="fade modal-backdrop show" />

			<div
				aria-labelledby={titleId}
				aria-modal="true"
				className="d-block downloads-agreement-modal fade modal show"
				role="dialog"
			>
				<div className="modal-dialog modal-lg">
					<div className="modal-content">
						<div className="modal-header">
							<div className="modal-title" id={titleId}>
								{`${i18n.translate('download')} ${fileName}`}
							</div>

							<button
								aria-label={i18n.translate('cancel')}
								className="close"
								onClick={onClose}
								type="button"
							>
								<ClayIcon symbol="times" />
							</button>
						</div>

						<div className="modal-body">
							<p className="text-secondary">
								{i18n.translate(
									'before-downloading-you-must-agree-to-the-following-terms-and-conditions'
								)}
							</p>

							<h3>{i18n.translate('terms-and-conditions')}</h3>

							{loading && <Loading />}

							{error && (
								<div className="alert alert-warning">
									{i18n.translate(
										'an-unexpected-error-occurred'
									)}
								</div>
							)}

							{content && (
								<iframe
									className="border downloads-agreement-content w-100"
									sandbox=""
									srcDoc={content}
									title={i18n.translate(
										'terms-and-conditions'
									)}
								/>
							)}

							<div className="mt-3">
								<ClayCheckbox
									checked={accepted}
									disabled={!content}
									label={i18n.translate(
										'i-have-read-and-agree-with-the-above-terms-and-conditions'
									)}
									onChange={() => setAccepted(!accepted)}
								/>
							</div>
						</div>

						<div className="modal-footer">
							<div className="modal-item-last">
								<div className="btn-group">
									<div className="btn-group-item">
										<ClayButton
											displayType="secondary"
											onClick={onClose}
										>
											{i18n.translate('cancel')}
										</ClayButton>
									</div>

									<div className="btn-group-item">
										<ClayButton
											disabled={!accepted || submitting}
											onClick={handleAccept}
										>
											{i18n.translate('download')}
										</ClayButton>
									</div>
								</div>
							</div>
						</div>
					</div>
				</div>
			</div>
		</>
	);
};

export default AgreementModal;
