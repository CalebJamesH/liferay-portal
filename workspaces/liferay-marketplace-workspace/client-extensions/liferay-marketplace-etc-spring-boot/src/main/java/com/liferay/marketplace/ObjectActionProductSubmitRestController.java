/**
 * SPDX-FileCopyrightText: (c) 2024 Liferay, Inc. https://liferay.com
 * SPDX-License-Identifier: LGPL-2.1-or-later OR LicenseRef-Liferay-DXP-EULA-2.0.0-2023-06
 */

package com.liferay.marketplace;

import com.liferay.client.extension.util.spring.boot3.BaseRestController;
import com.liferay.headless.commerce.admin.catalog.client.dto.v1_0.Product;
import com.liferay.marketplace.service.MarketplaceService;
import com.liferay.petra.string.StringBundler;
import com.liferay.portal.kernel.util.HashMapBuilder;

import java.net.URL;

import java.time.ZoneId;
import java.time.format.DateTimeFormatter;

import java.util.Date;

import org.apache.commons.logging.Log;
import org.apache.commons.logging.LogFactory;

import org.json.JSONObject;

import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.security.core.annotation.AuthenticationPrincipal;
import org.springframework.security.oauth2.jwt.Jwt;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

/**
 * @author Caleb Hall
 */
@RequestMapping("/object/action/product/submit")
@RestController
public class ObjectActionProductSubmitRestController
	extends BaseRestController {

	@PostMapping("product/submit")
	public void postProductSubmit(
			@AuthenticationPrincipal Jwt jwt, @RequestBody String json)
		throws Exception {

		if (_log.isInfoEnabled()) {
			_log.info("POST product submit " + json);
		}

		JSONObject jsonObject = new JSONObject(json);

		JSONObject modelCPDefinitionJSONObject = jsonObject.getJSONObject(
			"modelCPDefinition");

		Product product = _marketplaceService.getProduct(
			modelCPDefinitionJSONObject.getLong("CProductId"));

		_marketplaceService.postNotificationQueueEntry(
			null, "MARKETPLACE-PRODUCT-SUBMIT-TEMPLATE",
			new HashMapBuilder<String, Object>().put(
				"[%CPDEFINITION_NAME%]",
				product.getName(
				).get(
					modelCPDefinitionJSONObject.getString("defaultLanguageId")
				)
			).put(
				"[%CPDEFINITION_THUMBNAIL%]",
				new URL(
					"http://" + lxcDXPMainDomain + product.getThumbnail()
				).toString()
			).put(
				"[%CPDEFINITION_DEVELOPER_NAME%]",
				_marketplaceService.getCatalog(
					product.getCatalogId()
				).getName()
			).put(
				"[%CPDEFINITION_URL%]",
				new URL(
					StringBundler.concat(
						lxcDXPServerProtocol, "://", lxcDXPMainDomain,
						"/web/marketplace/administrator-dashboard#/apps/",
						modelCPDefinitionJSONObject.getLong("CProductId"))
				).toString()
			).put(
				"[%CPDEFINITION_CREATEDATE%]", _format(product.getCreateDate())
			).put(
				"[%CPDEFINITION_ID%]",
				String.valueOf(
					modelCPDefinitionJSONObject.getLong("CPDefinitionId"))
			).build());
	}

	private String _format(Date date) {
		return _format(date, "Not Applicable");
	}

	private String _format(Date date, String defaultValue) {
		if (date == null) {
			return defaultValue;
		}

		return date.toInstant(
		).atZone(
			ZoneId.of("UTC")
		).format(
			DateTimeFormatter.ofPattern("MMMM d, yyyy")
		);
	}

	private static final Log _log = LogFactory.getLog(
		ObjectActionProductSubmitRestController.class);

	@Autowired
	private MarketplaceService _marketplaceService;

}