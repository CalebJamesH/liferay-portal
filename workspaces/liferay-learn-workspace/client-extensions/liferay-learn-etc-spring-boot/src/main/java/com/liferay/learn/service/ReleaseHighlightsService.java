/**
 * SPDX-FileCopyrightText: (c) 2026 Liferay, Inc. https://liferay.com
 * SPDX-License-Identifier: LGPL-2.1-or-later OR LicenseRef-Liferay-DXP-EULA-2.0.0-2023-06
 */

package com.liferay.learn.service;

import com.liferay.client.extension.util.spring.boot3.client.LiferayOAuth2AccessTokenManager;
import com.liferay.client.extension.util.spring.boot3.service.BaseService;
import com.liferay.portal.kernel.util.Validator;

import java.net.URI;

import java.time.Duration;
import java.time.Instant;
import java.time.LocalDate;
import java.time.ZoneOffset;

import java.util.HashMap;
import java.util.List;
import java.util.Map;

import org.apache.commons.logging.Log;
import org.apache.commons.logging.LogFactory;

import org.json.JSONArray;
import org.json.JSONObject;

import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.stereotype.Component;
import org.springframework.web.util.UriComponentsBuilder;

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
		JSONArray highlightsJSONArray = new JSONArray();

		for (String releaseKey : releaseKeys.reversed()) {
			if (_releaseNotesService.isQuarterlyRelease(releaseKey)) {
				hasQuarterlyReleases = true;

				continue;
			}

			JSONObject highlightJSONObject = highlightJSONObjects.get(
				releaseKey);

			if (highlightJSONObject != null) {
				highlightsJSONArray.put(highlightJSONObject);
			}
		}

		return new JSONObject(
		).put(
			"hasQuarterlyReleases", hasQuarterlyReleases
		).put(
			"items", highlightsJSONArray
		).put(
			"total", highlightsJSONArray.length()
		);
	}

	private synchronized Map<String, JSONObject> _getHighlightJSONObjects()
		throws Exception {

		Instant instant = Instant.now();

		if ((_highlightJSONObjects != null) &&
			instant.isBefore(_highlightsExpirationInstant)) {

			return _highlightJSONObjects;
		}

		try {
			_highlightJSONObjects = _getStructuredContentHighlightJSONObjects();
			_highlightsExpirationInstant = instant.plus(_CACHE_DURATION);
		}
		catch (Exception exception) {
			if (_highlightJSONObjects == null) {
				throw exception;
			}

			if (_log.isWarnEnabled()) {
				_log.warn("Unable to refresh release highlights", exception);
			}

			_highlightsExpirationInstant = instant.plus(_RETRY_DURATION);
		}

		return _highlightJSONObjects;
	}

	private JSONObject _getHighlightJSONObject(
		JSONObject structuredContentJSONObject) {

		JSONObject highlightJSONObject = new JSONObject(
		).put(
			"title", structuredContentJSONObject.getString("title")
		);

		JSONArray contentFieldsJSONArray =
			structuredContentJSONObject.getJSONArray("contentFields");

		for (int i = 0; i < contentFieldsJSONArray.length(); i++) {
			JSONObject contentFieldJSONObject =
				contentFieldsJSONArray.getJSONObject(i);

			JSONObject contentFieldValueJSONObject =
				contentFieldJSONObject.getJSONObject("contentFieldValue");

			String data = contentFieldValueJSONObject.optString("data");

			if (Validator.isNull(data)) {
				continue;
			}

			String name = contentFieldJSONObject.getString("name");

			if (name.equals("releaseDate")) {
				data = String.valueOf(
					LocalDate.ofInstant(Instant.parse(data), ZoneOffset.UTC));
			}

			highlightJSONObject.put(name, data);
		}

		return highlightJSONObject;
	}

	private JSONObject _getJSONObject(String authorization, URI uri)
		throws Exception {

		String json = get(authorization, uri);

		if (json == null) {
			throw new Exception("Unable to get " + uri);
		}

		return new JSONObject(json);
	}

	private Map<String, JSONObject> _getStructuredContentHighlightJSONObjects()
		throws Exception {

		String authorization =
			_liferayOAuth2AccessTokenManager.getAuthorization(
				"liferay-learn-etc-spring-boot-oahs");

		JSONObject structuredContentFolderJSONObject = _getJSONObject(
			authorization,
			UriComponentsBuilder.fromPath(
				"/o/headless-delivery/v1.0/sites/{siteId}" +
					"/structured-content-folders/by-external-reference-code" +
						"/{externalReferenceCode}"
			).buildAndExpand(
				_siteExternalReferenceCode,
				_STRUCTURED_CONTENT_FOLDER_EXTERNAL_REFERENCE_CODE
			).toUri());

		JSONObject structuredContentsJSONObject = _getJSONObject(
			authorization,
			UriComponentsBuilder.fromPath(
				"/o/headless-delivery/v1.0/structured-content-folders" +
					"/{structuredContentFolderId}/structured-contents"
			).queryParam(
				"fields",
				"contentFields.contentFieldValue.data,contentFields.name,title"
			).queryParam(
				"pageSize", -1
			).buildAndExpand(
				structuredContentFolderJSONObject.getLong("id")
			).toUri());

		JSONArray structuredContentsJSONArray =
			structuredContentsJSONObject.getJSONArray("items");

		Map<String, JSONObject> highlightJSONObjects = new HashMap<>();

		for (int i = 0; i < structuredContentsJSONArray.length(); i++) {
			JSONObject highlightJSONObject = _getHighlightJSONObject(
				structuredContentsJSONArray.getJSONObject(i));

			String releaseKey = highlightJSONObject.optString("releaseKey");

			if (Validator.isNotNull(releaseKey)) {
				highlightJSONObjects.put(releaseKey, highlightJSONObject);
			}
		}

		return highlightJSONObjects;
	}

	private static final Duration _CACHE_DURATION = Duration.ofHours(1);

	private static final Duration _RETRY_DURATION = Duration.ofMinutes(5);

	private static final String
		_STRUCTURED_CONTENT_FOLDER_EXTERNAL_REFERENCE_CODE =
			"RELEASE_HIGHLIGHTS";

	private static final Log _log = LogFactory.getLog(
		ReleaseHighlightsService.class);

	private Instant _highlightsExpirationInstant;
	private Map<String, JSONObject> _highlightJSONObjects;

	@Autowired
	private LiferayOAuth2AccessTokenManager _liferayOAuth2AccessTokenManager;

	@Autowired
	private ReleaseNotesService _releaseNotesService;

	@Value(
		"${liferay.learn.release.notes.highlights.site.external.reference.code}"
	)
	private String _siteExternalReferenceCode;

}