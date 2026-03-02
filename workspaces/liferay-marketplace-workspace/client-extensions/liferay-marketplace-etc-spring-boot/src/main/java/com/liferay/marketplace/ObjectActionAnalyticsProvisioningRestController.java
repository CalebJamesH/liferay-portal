/**
 * SPDX-FileCopyrightText: (c) 2024 Liferay, Inc. https://liferay.com
 * SPDX-License-Identifier: LGPL-2.1-or-later OR LicenseRef-Liferay-DXP-EULA-2.0.0-2023-06
 */

package com.liferay.marketplace;

import com.liferay.client.extension.util.spring.boot3.BaseRestController;
import com.liferay.headless.commerce.admin.order.client.dto.v1_0.Order;
import com.liferay.marketplace.constants.MarketplaceConstants;
import com.liferay.marketplace.service.MarketplaceService;
import com.liferay.portal.kernel.util.HashMapBuilder;

import java.util.Base64;
import java.util.Map;

import org.apache.commons.logging.Log;
import org.apache.commons.logging.LogFactory;

import org.json.JSONObject;

import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.http.HttpHeaders;
import org.springframework.http.MediaType;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;
import org.springframework.web.reactive.function.BodyInserters;
import org.springframework.web.reactive.function.client.WebClient;

/**
 * @author Caleb Hall
 */
@RequestMapping("/object/action/analytics/provisioning")
@RestController
public class ObjectActionAnalyticsProvisioningRestController
	extends BaseRestController {

	@PostMapping
	public void post(@RequestBody String json) throws Exception {
		JSONObject commerceOrderJSONObject = new JSONObject(
			json
		).getJSONObject(
			"commerceOrder"
		);

		Order order = _marketplaceService.getOrder(
			commerceOrderJSONObject.getLong("id"));

		if (_log.isInfoEnabled()) {
			_log.info("Provisioning order " + order.getId());
		}

		Map<String, String> customFields =
			(Map<String, String>)order.getCustomFields();

		JSONObject orderMetadataJSONObject = new JSONObject(
			customFields.getOrDefault("order-metadata", "{}"));

		JSONObject analyticsFormJSONObject =
			orderMetadataJSONObject.optJSONObject("analyticsForm");

		String response = WebClient.builder(
		).baseUrl(
			_analyticsAuthUrl
		).defaultHeader(
			HttpHeaders.AUTHORIZATION, _getAuthorization()
		).build(
		).post(
		).uri(
			"/o/faro/main/project/unprovisioned"
		).contentType(
			MediaType.APPLICATION_FORM_URLENCODED
		).body(
			BodyInserters.fromFormData(
				"corpProjectName",
				analyticsFormJSONObject.getString("corpProjectName")
			).with(
				"corpProjectUuid",
				analyticsFormJSONObject.getString("corpProjectUuid")
			).with(
				"incidentReportEmailAddresses",
				analyticsFormJSONObject.getJSONArray(
					"incidentReportEmailAddresses"
				).toString()
			).with(
				"name", analyticsFormJSONObject.getString("name")
			).with(
				"serverLocation",
				analyticsFormJSONObject.optString(
					"serverLocation", "us-west1-ac-uat-c1")
			).with(
				"sharedCluster", "false"
			).with(
				"trial", "true"
			).with(
				"ownerEmailAddress",
				analyticsFormJSONObject.getString("ownerEmailAddress")
			)
		).retrieve(
		).bodyToMono(
			String.class
		).block();

		if (response == null) {
			return;
		}

		if (_log.isInfoEnabled()) {
			_log.info("Analytics project created for order " + order.getId());
		}

		_marketplaceService.updateOrder(
			HashMapBuilder.put(
				"order-metadata",
				orderMetadataJSONObject.put(
					"analyticsProject", new JSONObject(response)
				).toString()
			).build(),
			order.getId(), MarketplaceConstants.ORDER_STATUS_COMPLETED);
	}

	private String _getAuthorization() {
		Base64.Encoder encoder = Base64.getEncoder();

		String authorization =
			_analyticsAuthEmailAddress + ":" + _analyticsAuthPassword;

		return "Basic " + encoder.encodeToString(authorization.getBytes());
	}

	private static final Log _log = LogFactory.getLog(
		ObjectActionAnalyticsProvisioningRestController.class);

	@Value("${liferay.marketplace.analytics.auth.email.address}")
	private String _analyticsAuthEmailAddress;

	@Value("${liferay.marketplace.analytics.auth.password}")
	private String _analyticsAuthPassword;

	@Value("${liferay.marketplace.analytics.auth.url}")
	private String _analyticsAuthUrl;

	@Autowired
	private MarketplaceService _marketplaceService;

}