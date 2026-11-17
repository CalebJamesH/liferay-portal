/**
 * SPDX-FileCopyrightText: (c) 2026 Liferay, Inc. https://liferay.com
 * SPDX-License-Identifier: LGPL-2.1-or-later OR LicenseRef-Liferay-DXP-EULA-2.0.0-2023-06
 */

import {useMemo} from 'react';
import {Link, useParams} from 'react-router-dom';
import useDownloadsRequest from '~/hooks/useDownloadsRequest';
import {getDownload, getDownloadProducts} from '~/services/rest/downloads';
import i18n from '~/utils/I18n';

import Loading from '~/components/Loading/Loading';
import DownloadEntry from '../components/DownloadEntry/DownloadEntry';
import DownloadsErrorAlert from '../components/DownloadsErrorAlert/DownloadsErrorAlert';

const DownloadView = () => {
	const {urlTitle = ''} = useParams();

	const request = useMemo(() => () => getDownload(urlTitle), [urlTitle]);

	const {data: download, error, loading} = useDownloadsRequest(request);

	const {data: products, loading: productsLoading} =
		useDownloadsRequest(getDownloadProducts);

	const product = products?.find(
		(product) => product.key === download?.product
	);

	const archiveSearchParams = new URLSearchParams();

	if (download?.product) {
		archiveSearchParams.set('product', download.product);
	}

	if (download?.fileTypes.length) {
		archiveSearchParams.set('fileType', download.fileTypes[0]);
	}

	const [archiveMessageStart, archiveMessageEnd = ''] = i18n
		.translate('view-previous-releases-in-the-x')
		.split('{0}');

	return (
		<div className="container-fluid container-fluid-max-xl downloads py-5">
			<h1>{i18n.translate('download')}</h1>

			{(loading || productsLoading) && <Loading />}

			{error && <DownloadsErrorAlert error={error} />}

			{download && (
				<>
					<ul className="downloads-entries p-0">
						<DownloadEntry download={download} />
					</ul>

					<p className="mt-4">
						{archiveMessageStart}

						<Link
							to={{
								pathname: '/',
								search: archiveSearchParams.toString(),
							}}
						>
							{i18n.translate('archive')}
						</Link>

						{archiveMessageEnd}
					</p>
				</>
			)}
		</div>
	);
};

export default DownloadView;
