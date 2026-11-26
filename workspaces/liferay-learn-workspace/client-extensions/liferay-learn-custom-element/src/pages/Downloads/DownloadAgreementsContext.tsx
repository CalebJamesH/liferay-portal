/**
 * SPDX-FileCopyrightText: (c) 2026 Liferay, Inc. https://liferay.com
 * SPDX-License-Identifier: LGPL-2.1-or-later OR LicenseRef-Liferay-DXP-EULA-2.0.0-2023-06
 */

import {ReactNode, createContext, useCallback, useContext} from 'react';
import useDownloadsRequest from '~/hooks/useDownloadsRequest';
import {
	AgreementType,
	Agreements,
	acceptAgreement as acceptAgreementRequest,
	getAgreements,
} from '~/services/rest/downloads';

type DownloadAgreementsContextValue = {
	acceptAgreement: (agreementType: AgreementType) => Promise<void>;
	agreements?: Agreements;
	isAccepted: (agreementType: AgreementType | '') => boolean;
};

const DownloadAgreementsContext = createContext<DownloadAgreementsContextValue>(
	{
		acceptAgreement: () => Promise.resolve(),
		isAccepted: () => false,
	}
);

export function DownloadAgreementsProvider({children}: {children: ReactNode}) {
	const {data: agreements, setData} = useDownloadsRequest(getAgreements);

	const acceptAgreement = useCallback(
		async (agreementType: AgreementType) => {
			setData(await acceptAgreementRequest(agreementType));
		},
		[setData]
	);

	const isAccepted = useCallback(
		(agreementType: AgreementType | '') =>
			!agreementType || Boolean(agreements?.[agreementType]?.accepted),
		[agreements]
	);

	return (
		<DownloadAgreementsContext.Provider
			value={{acceptAgreement, agreements, isAccepted}}
		>
			{children}
		</DownloadAgreementsContext.Provider>
	);
}

export function useDownloadAgreements() {
	return useContext(DownloadAgreementsContext);
}
