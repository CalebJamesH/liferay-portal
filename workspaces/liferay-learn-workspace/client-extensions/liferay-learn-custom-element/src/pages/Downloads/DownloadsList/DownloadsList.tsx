/**
 * SPDX-FileCopyrightText: (c) 2026 Liferay, Inc. https://liferay.com
 * SPDX-License-Identifier: LGPL-2.1-or-later OR LicenseRef-Liferay-DXP-EULA-2.0.0-2023-06
 */

import {ClayPaginationBarWithBasicItems} from '@clayui/pagination-bar';
import {useId, useMemo, useState} from 'react';
import {useSearchParams} from 'react-router-dom';
import useDownloadsRequest from '~/hooks/useDownloadsRequest';
import {getDownloadProducts, getDownloads} from '~/services/rest/downloads';
import i18n from '~/utils/I18n';
import {
	paginationDeltas,
	paginationLabels,
} from '~/utils/constants/paginationOptions';

import Loading from '~/components/Loading/Loading';
import DownloadEntry from '../components/DownloadEntry/DownloadEntry';
import DownloadsErrorAlert from '../components/DownloadsErrorAlert/DownloadsErrorAlert';

const DownloadsList = () => {
	const [pageSize, setPageSize] = useState(paginationDeltas[0].label);
	const [searchParams, setSearchParams] = useSearchParams();
	const fileTypeSelectId = useId();
	const productSelectId = useId();

	const page = Number(searchParams.get('page')) || 1;

	const {
		data: products,
		error: productsError,
		loading: productsLoading,
	} = useDownloadsRequest(getDownloadProducts);

	const product = products?.find(
		(product) => product.key === searchParams.get('product')
	);

	const fileType = product?.fileTypes.find(
		(fileType) => fileType.key === searchParams.get('fileType')
	);

	const downloadsRequest = useMemo(() => {
		if (!product || !fileType) {
			return null;
		}

		return () =>
			getDownloads({
				fileType: fileType.key,
				page,
				pageSize,
				product: product.key,
			});
	}, [fileType, page, pageSize, product]);

	const {
		data: downloads,
		error,
		loading,
	} = useDownloadsRequest(downloadsRequest);

	const updateSearchParams = (params: {[key: string]: string}) => {
		const urlSearchParams = new URLSearchParams(searchParams);

		Object.entries(params).forEach(([key, value]) => {
			if (value) {
				urlSearchParams.set(key, value);
			}
			else {
				urlSearchParams.delete(key);
			}
		});

		setSearchParams(urlSearchParams);
	};

	const renderResults = () => {
		if (error) {
			return <DownloadsErrorAlert error={error} />;
		}

		if (loading) {
			return <Loading />;
		}

		if (!downloads) {
			return (
				<p className="downloads-empty text-secondary">
					{i18n.translate(
						'select-a-product-and-a-file-type-to-see-the-available-downloads'
					)}
				</p>
			);
		}

		if (!downloads.items.length) {
			return (
				<p className="downloads-empty text-secondary">
					{i18n.translate('no-downloads-were-found')}
				</p>
			);
		}

		return (
			<>
				<ul className="downloads-entries p-0">
					{downloads.items.map((download) => (
						<DownloadEntry download={download} key={download.id} />
					))}
				</ul>

				<ClayPaginationBarWithBasicItems
					active={page}
					activeDelta={pageSize}
					deltas={paginationDeltas}
					labels={paginationLabels}
					onActiveChange={(value: number) =>
						updateSearchParams({page: String(value)})
					}
					onDeltaChange={(value: number) => {
						setPageSize(value);
						updateSearchParams({page: ''});
					}}
					totalItems={downloads.totalCount}
				/>
			</>
		);
	};

	return (
		<div className="container-fluid container-fluid-max-xl downloads py-5">
			<h1>{i18n.translate('downloads')}</h1>

			<p className="text-secondary">
				{i18n.translate(
					'use-the-dropdown-menus-below-to-find-the-downloads-you-need'
				)}
			</p>

			{productsError && <DownloadsErrorAlert error={productsError} />}

			{productsLoading && <Loading />}

			{products && (
				<div className="c-gap-4 d-flex downloads-filters flex-wrap mb-4">
					<div className="form-group mb-0">
						<label htmlFor={productSelectId}>
							{i18n.translate('product')}
						</label>

						<select
							className="form-control"
							id={productSelectId}
							onChange={(event) => {
								const selectedProduct = products.find(
									(product) =>
										product.key === event.target.value
								);

								updateSearchParams({
									fileType:
										selectedProduct?.fileTypes.length === 1
											? selectedProduct.fileTypes[0].key
											: '',
									page: '',
									product: event.target.value,
								});
							}}
							value={product?.key ?? ''}
						>
							<option value="">
								{i18n.translate('select-product')}
							</option>

							{products.map((product) => (
								<option key={product.key} value={product.key}>
									{product.name}
								</option>
							))}
						</select>
					</div>

					<div className="form-group mb-0">
						<label htmlFor={fileTypeSelectId}>
							{i18n.translate('type')}
						</label>

						<select
							className="form-control"
							disabled={!product}
							id={fileTypeSelectId}
							onChange={(event) =>
								updateSearchParams({
									fileType: event.target.value,
									page: '',
								})
							}
							value={fileType?.key ?? ''}
						>
							<option value="">
								{i18n.translate('select-file-type')}
							</option>

							{product?.fileTypes.map((fileType) => (
								<option key={fileType.key} value={fileType.key}>
									{fileType.name}
								</option>
							))}
						</select>
					</div>
				</div>
			)}

			{products && renderResults()}
		</div>
	);
};

export default DownloadsList;
