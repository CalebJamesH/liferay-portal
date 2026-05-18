/**
 * SPDX-FileCopyrightText: (c) 2000 Liferay, Inc. https://liferay.com
 * SPDX-License-Identifier: LGPL-2.1-or-later OR LicenseRef-Liferay-DXP-EULA-2.0.0-2023-06
 */

import ClayButton from '@clayui/button';

import {NavbarProps} from '../../../../components/Navbar';
import {OrderTypes, orderTypeDocumentationURL} from '../../../../enums/Order';
import useGetProductByOrderId from '../../../../hooks/useGetProductByOrderId';
import i18n from '../../../../i18n';
import {Liferay} from '../../../../liferay/liferay';
import {getSiteURL} from '../../../../utils/site';
import {BaseOutlet} from '../Apps/App/AppOutlet';
import {useMarketplaceContext} from '../../../../context/MarketplaceContext';
import {safeJSONParse} from '../../../../utils/util';

type ProductAndOrderPayload = NonNullable<
	ReturnType<typeof useGetProductByOrderId>['data']
>;

const getTabs = (data: ProductAndOrderPayload): NavbarProps['routes'] => {
	const {orderTypeExternalReferenceCode} = data?.placedOrder ?? {};

	if (orderTypeExternalReferenceCode === OrderTypes.AI_HUB) {
		return [];
	}

	const isCMP = orderTypeExternalReferenceCode === OrderTypes.CMP;
	const isDSR = orderTypeExternalReferenceCode === OrderTypes.DSR;
	const isDXP = orderTypeExternalReferenceCode === OrderTypes.DXP;

	return [
		{
			name: i18n.translate('activation-keys'),
			path: '',
			visible: isCMP || isDSR || isDXP,
		},
		{
			name: i18n.translate('bundles'),
			path: 'bundles',
			visible: isDXP,
		},
		{
			name: i18n.translate('tokens'),
			path: 'tokens',
			visible: isDSR,
		},
	];
};

const LiferayProductsOutlet = () => {
	const {properties} = useMarketplaceContext();

	return (
		<BaseOutlet
			actionButtons={(props) => {
				const appBeta =
					props?.marketplaceDeliveryProduct?.specificationValues
						?.APP_BETA;

				if (
					[
						OrderTypes.AI_HUB,
						OrderTypes.CMP,
						OrderTypes.DSR,
						OrderTypes.DXP,
					].includes(
						props?.placedOrder
							?.orderTypeExternalReferenceCode as OrderTypes
					)
				) {
					return (
						<div className="mt-6">
							{appBeta && (
								<ClayButton
									className="mr-2"
									displayType="secondary"
									onClick={() => {
										Liferay.Util.navigate(
											`${getSiteURL()}/product-feedback?orderId=${String(props?.placedOrder?.id)}`
										);
									}}
									outline
									size="sm"
								>
									{i18n.translate('share-beta-feedback')}
								</ClayButton>
							)}

							{[OrderTypes.CMP, OrderTypes.DXP].includes(
								props?.placedOrder
									?.orderTypeExternalReferenceCode as OrderTypes
							) && (
								<ClayButton
									displayType="primary"
									onClick={() => {
										Liferay.Util.navigate(
											`${getSiteURL()}/product-purchase?productId=${props?.product?.productId}#/activation-key-form`
										);
									}}
									outline
									size={appBeta ? 'sm' : 'regular'}
								>
									{i18n.translate('new-activation-key')}
								</ClayButton>
							)}
						</div>
					);
				}

				if (
					props.marketplaceDeliveryProduct?.specificationValues
						?.SOLUTION_TYPE === 'liferay-data-platform'
				) {
					const orderMetadata = safeJSONParse(
						props.placedOrder?.customFields?.ORDER_METADATA || '{}',
						{
							analyticsProject: {groupId: 0},
						}
					);

					const groupId = orderMetadata?.analyticsProject?.groupId;

					return (
						<ClayButton
							displayType="primary"
							onClick={() => {
								window.open(
									`${properties.analyticsCloudURL}/workspace/${groupId}`
								);
							}}
							outline
							size="regular"
						>
							{i18n.translate('go-to-liferay-data-platform')}
						</ClayButton>
					);
				}
			}}
			backTitle={i18n.translate('back-to-my-products')}
			backURL="../../products"
			description={(props) => {
				const documentationURL =
					orderTypeDocumentationURL[{
    "actions": {},
    "facets": [],
    "items": [
        {
            "dateCreated": "2020-12-18T18:19:47Z",
            "dateModified": "2022-07-27T04:56:32Z",
            "emailAddress": "c6ad6bd45d0d581b004b@uat.com.broken",
            "emailAddressVerified": true,
            "entitlements": [
                {
                    "entitlementDefinitionKey": "KOR-35736",
                    "name": "Customer"
                }
            ],
            "externalLinks": [],
            "firstName": "c6ad6bd45d0d581b004b",
            "key": "KOR-596293",
            "languageId": "es_ES",
            "lastName": "c6ad6bd45d0d581b004b",
            "middleName": "",
            "teams": [
                {
                    "accountKey": "KOR-80251579",
                    "dateCreated": "2020-12-18T17:11:01Z",
                    "dateModified": "2021-07-30T17:57:47Z",
                    "externalLinks": [],
                    "key": "KOR-38352",
                    "name": "Everis Spain S.L.",
                    "system": true
                },
                {
                    "accountKey": "KOR-89233163",
                    "dateCreated": "2020-12-18T17:55:34Z",
                    "dateModified": "2021-12-07T17:42:09Z",
                    "externalLinks": [],
                    "key": "KOR-406925",
                    "name": "Gobsmack Ltd - Loyalty Platform - CLOSED",
                    "system": true
                },
                {
                    "accountKey": "KOR-1652566",
                    "dateCreated": "2021-02-19T10:25:34Z",
                    "dateModified": "2024-01-19T10:04:15Z",
                    "externalLinks": [],
                    "key": "KOR-1652589",
                    "name": "RECC - Customer Portal",
                    "system": true
                },
                {
                    "accountKey": "KOR-1652997",
                    "dateCreated": "2021-02-19T10:25:39Z",
                    "dateModified": "2024-01-19T10:04:16Z",
                    "externalLinks": [],
                    "key": "KOR-1653020",
                    "name": "RECC - Analytics Cloud",
                    "system": true
                }
            ],
            "uuid": "57b95306-ec17-4ae5-b21b-f3cf7fd127f7"
        },
        {
            "dateCreated": "2020-12-18T18:24:43Z",
            "dateModified": "2021-06-03T18:40:03Z",
            "emailAddress": "nick.ward@liferay.com.broken",
            "emailAddressVerified": true,
            "entitlements": [
                {
                    "entitlementDefinitionKey": "KOR-35736",
                    "name": "Customer"
                },
                {
                    "entitlementDefinitionKey": "KOR-35775",
                    "name": "Customer - Commerce"
                },
                {
                    "entitlementDefinitionKey": "KOR-35749",
                    "name": "Customer - DXP"
                },
                {
                    "entitlementDefinitionKey": "KOR-35762",
                    "name": "Customer - Portal"
                },
                {
                    "entitlementDefinitionKey": "KOR-35723",
                    "name": "Liferay Employee"
                }
            ],
            "externalLinks": [],
            "firstName": "Nick",
            "key": "KOR-606088",
            "languageId": "en_US",
            "lastName": "Ward",
            "middleName": "",
            "teams": [
                {
                    "accountKey": "KOR-15097278",
                    "dateCreated": "2020-12-18T17:10:48Z",
                    "dateModified": "2026-05-14T12:24:52Z",
                    "externalLinks": [],
                    "key": "KOR-37004",
                    "name": "Liferay, Inc.",
                    "system": true
                },
                {
                    "accountKey": "KOR-70944889",
                    "dateCreated": "2020-12-18T17:26:56Z",
                    "dateModified": "2023-12-14T12:37:50Z",
                    "externalLinks": [],
                    "key": "KOR-162325",
                    "name": "Innovate UK - TSB Web",
                    "system": true
                },
                {
                    "accountKey": "KOR-15097278",
                    "dateCreated": "2022-06-20T17:19:30Z",
                    "dateModified": "2022-12-13T18:09:07Z",
                    "externalLinks": [
                        {
                            "dateCreated": "2022-06-20T17:21:51Z",
                            "domain": "okta",
                            "entityId": "00g18yfnjx6xXB0Ko0h8",
                            "entityName": "group",
                            "key": "KOR-14041184",
                            "url": ""
                        }
                    ],
                    "key": "KOR-14041148",
                    "name": "Account Access EU",
                    "system": false
                }
            ],
            "uuid": "d5b122a2-9d3d-44df-92cb-5fa64b7bac32"
        },
        {
            "dateCreated": "2021-09-16T07:32:13Z",
            "dateModified": "2022-07-27T00:02:55Z",
            "emailAddress": "af7e54853f237d4868b7@uat.com.broken",
            "emailAddressVerified": true,
            "entitlements": [
                {
                    "entitlementDefinitionKey": "KOR-35736",
                    "name": "Customer"
                }
            ],
            "externalLinks": [],
            "firstName": "af7e54853f237d4868b7",
            "key": "KOR-3991916",
            "languageId": "es_ES",
            "lastName": "af7e54853f237d4868b7",
            "middleName": "",
            "teams": [
                {
                    "accountKey": "KOR-1652566",
                    "dateCreated": "2021-02-19T10:25:34Z",
                    "dateModified": "2024-01-19T10:04:15Z",
                    "externalLinks": [],
                    "key": "KOR-1652589",
                    "name": "RECC - Customer Portal",
                    "system": true
                },
                {
                    "accountKey": "KOR-1652997",
                    "dateCreated": "2021-02-19T10:25:39Z",
                    "dateModified": "2024-01-19T10:04:16Z",
                    "externalLinks": [],
                    "key": "KOR-1653020",
                    "name": "RECC - Analytics Cloud",
                    "system": true
                }
            ],
            "uuid": "e53c63aa-950f-4643-b9e1-4ee1252fc271"
        }
    ],
    "lastPage": 1,
    "page": 1,
    "pageSize": 20,
    "totalCount": 3
}
						props?.placedOrder
							?.orderTypeExternalReferenceCode as OrderTypes
					];

				return (
					<>
						{props?.product?.shortDescription}

						{documentationURL && (
							<span className="d-block mt-2">
								{i18n.translate('need-help-getting-started?')}

								<a
									className="font-weight-bold ml-1"
									href={documentationURL}
									rel="noopener noreferrer"
									target="_blank"
								>
									{i18n.translate('view-the-documentation')}
								</a>
							</span>
						)}
					</>
				);
			}}
			routes={getTabs}
			showActions={false}
		/>
	);
};

export default LiferayProductsOutlet;
