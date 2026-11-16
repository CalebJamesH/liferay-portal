/**
 * SPDX-FileCopyrightText: (c) 2026 Liferay, Inc. https://liferay.com
 * SPDX-License-Identifier: LGPL-2.1-or-later OR LicenseRef-Liferay-DXP-EULA-2.0.0-2023-06
 */

package com.liferay.learn.service;

import com.liferay.client.extension.util.spring.boot3.client.LiferayOAuth2AccessTokenManager;
import com.liferay.client.extension.util.spring.boot3.service.BaseService;
import com.liferay.headless.admin.site.client.dto.v1_0.Site;
import com.liferay.headless.admin.site.client.resource.v1_0.SiteResource;
import com.liferay.headless.delivery.client.dto.v1_0.ContentField;
import com.liferay.headless.delivery.client.dto.v1_0.ContentFieldValue;
import com.liferay.headless.delivery.client.dto.v1_0.StructuredContent;
import com.liferay.headless.delivery.client.dto.v1_0.StructuredContentFolder;
import com.liferay.headless.delivery.client.pagination.Page;
import com.liferay.headless.delivery.client.pagination.Pagination;
import com.liferay.headless.delivery.client.resource.v1_0.StructuredContentFolderResource;
import com.liferay.headless.delivery.client.resource.v1_0.StructuredContentResource;
import com.liferay.portal.kernel.util.Validator;

import java.time.Duration;
import java.time.Instant;
import java.time.LocalDate;
import java.time.ZoneOffset;

import java.util.Collection;
import java.util.HashMap;
import java.util.List;
import java.util.Map;

import org.apache.commons.logging.Log;
import org.apache.commons.logging.LogFactory;

import org.json.JSONArray;
import org.json.JSONObject;

import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.http.HttpHeaders;
import org.springframework.stereotype.Component;

/**
 * @author Caleb Hall
 */
@Component
public class ReleaseHighlightsService extends BaseService {

	public JSONObject getHighlightsJSONObject(
			String fromReleaseKey, String toReleaseKey)
		throws Exception {

		List<String> releaseKeys = _releaseNotesService.getReleaseKeys(
			fromReleaseKey, toReleaseKey);

		if (releaseKeys == null) {
			return null;
		}

		Map<String, JSONObject> highlightJSONObjects =
			_getHighlightJSONObjects();

		boolean hasQuarterlyReleases = false;
		JSONArray itemsJSONArray = new JSONArray();

		for (String releaseKey : releaseKeys.reversed()) {
			if (_releaseNotesService.isQuarterlyRelease(releaseKey)) {
				hasQuarterlyReleases = true;

				continue;
			}

			JSONObject highlightJSONObject = highlightJSONObjects.get(
				releaseKey);

			if (highlightJSONObject != null) {
				itemsJSONArray.put(highlightJSONObject);
			}
		}

		return new JSONObject(
		).put(
			"hasQuarterlyReleases", hasQuarterlyReleases
		).put(
			"items", itemsJSONArray
		).put(
			"total", itemsJSONArray.length()
		);
	}

	private String _getAuthorization() {
		return _liferayOAuth2AccessTokenManager.getAuthorization(
			"liferay-learn-etc-spring-boot-oahs");
	}

	private synchronized Map<String, JSONObject> _getHighlightJSONObjects()
		throws Exception {

		Instant instant = Instant.now();

		if ((_highlightJSONObjects != null) &&
			instant.isBefore(_highlightJSONObjectsExpirationInstant)) {

			return _highlightJSONObjects;
		}

		try {
			_loadHighlightJSONObjects();

			_highlightJSONObjectsExpirationInstant = instant.plus(
				Duration.ofHours(1));
		}
		catch (Exception exception) {
			if (_highlightJSONObjects == null) {
				throw exception;
			}

			if (_log.isWarnEnabled()) {
				_log.warn("Unable to refresh release highlights", exception);
			}

			_highlightJSONObjectsExpirationInstant = instant.plus(
				Duration.ofMinutes(5));
		}

		return _highlightJSONObjects;
	}

	private long _getSiteId() throws Exception {
		SiteResource siteResource = SiteResource.builder(
		).endpoint(
			lxcDXPMainDomain, lxcDXPServerProtocol
		).header(
			HttpHeaders.AUTHORIZATION, _getAuthorization()
		).build();

		Site site = siteResource.getSite(_siteExternalReferenceCode);

		return site.getId();
	}

	private long _getStructuredContentFolderId() throws Exception {
		StructuredContentFolderResource structuredContentFolderResource =
			StructuredContentFolderResource.builder(
			).endpoint(
				lxcDXPMainDomain, lxcDXPServerProtocol
			).header(
				HttpHeaders.AUTHORIZATION, _getAuthorization()
			).build();

		StructuredContentFolder structuredContentFolder =
			structuredContentFolderResource.
				getSiteStructuredContentFolderByExternalReferenceCode(
					_getSiteId(), "LEGACY_RELEASE_HIGHLIGHTS");

		return structuredContentFolder.getId();
	}

	private Collection<StructuredContent> _getStructuredContents(
			long structuredContentFolderId)
		throws Exception {

		StructuredContentResource structuredContentResource =
			StructuredContentResource.builder(
			).endpoint(
				lxcDXPMainDomain, lxcDXPServerProtocol
			).header(
				HttpHeaders.AUTHORIZATION, _getAuthorization()
			).parameter(
				"fields",
				"contentFields.contentFieldValue.data,contentFields.name,title"
			).build();

		Page<StructuredContent> page =
			structuredContentResource.
				getStructuredContentFolderStructuredContentsPage(
					structuredContentFolderId, null, null, null, null,
					Pagination.of(1, -1), null);

		return page.getItems();
	}

	private void _loadHighlightJSONObjects() throws Exception {
		Collection<StructuredContent> structuredContents =
			_getStructuredContents(_getStructuredContentFolderId());

		Map<String, JSONObject> highlightJSONObjects = new HashMap<>();

		for (StructuredContent structuredContent : structuredContents) {
			JSONObject jsonObject = _toJSONObject(structuredContent);

			String releaseKey = jsonObject.optString("releaseKey");

			if (Validator.isNotNull(releaseKey)) {
				highlightJSONObjects.put(releaseKey, jsonObject);
			}
		}

		_highlightJSONObjects = highlightJSONObjects;
	}

	private JSONObject _toJSONObject(StructuredContent structuredContent) {
		JSONObject jsonObject = new JSONObject(
		).put(
			"title", structuredContent.getTitle()
		);

		for (ContentField contentField : structuredContent.getContentFields()) {
			ContentFieldValue contentFieldValue =
				contentField.getContentFieldValue();

			String data = contentFieldValue.getData();

			if (Validator.isNull(data)) {
				continue;
			}

			String name = contentField.getName();

			if (name.equals("releaseDate")) {
				data = String.valueOf(
					LocalDate.ofInstant(Instant.parse(data), ZoneOffset.UTC));
			}

			jsonObject.put(name, data);
		}

		return jsonObject;
	}

	private static final Log _log = LogFactory.getLog(
		ReleaseHighlightsService.class);

	private Map<String, JSONObject> _highlightJSONObjects;
	private Instant _highlightJSONObjectsExpirationInstant;

	@Autowired
	private LiferayOAuth2AccessTokenManager _liferayOAuth2AccessTokenManager;

	@Autowired
	private ReleaseNotesService _releaseNotesService;

	@Value(
		"${liferay.learn.release.notes.highlights.site.external.reference.code}"
	)
	private String _siteExternalReferenceCode;

}