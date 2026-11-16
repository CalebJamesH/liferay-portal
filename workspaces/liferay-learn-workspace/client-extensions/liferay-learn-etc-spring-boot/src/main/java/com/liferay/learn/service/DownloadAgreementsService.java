/**
 * SPDX-FileCopyrightText: (c) 2026 Liferay, Inc. https://liferay.com
 * SPDX-License-Identifier: LGPL-2.1-or-later OR LicenseRef-Liferay-DXP-EULA-2.0.0-2023-06
 */

package com.liferay.learn.service;

import com.liferay.client.extension.util.spring.boot3.client.LiferayOAuth2AccessTokenManager;
import com.liferay.client.extension.util.spring.boot3.service.BaseService;
import com.liferay.petra.string.StringBundler;
import com.liferay.portal.kernel.util.Validator;

import java.math.BigDecimal;

import java.time.Duration;
import java.time.Instant;
import java.time.temporal.ChronoUnit;

import java.util.Collections;
import java.util.List;
import java.util.Map;
import java.util.concurrent.ConcurrentHashMap;

import org.apache.commons.logging.Log;
import org.apache.commons.logging.LogFactory;

import org.json.JSONArray;
import org.json.JSONObject;

import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.core.env.Environment;
import org.springframework.stereotype.Component;
import org.springframework.web.util.UriComponentsBuilder;

/**
 * @author Caleb Hall
 */
@Component
public class DownloadAgreementsService extends BaseService {

	public void acceptAgreement(String agreementType, long userId)
		throws Exception {

		post(
			_getAuthorization(),
			new JSONObject(
			).put(
				"acceptedDate",
				Instant.now(
				).truncatedTo(
					ChronoUnit.SECONDS
				).toString()
			).put(
				"agreementType",
				new JSONObject(
				).put(
					"key", agreementType
				)
			).put(
				"r_lUserToP2S3AgreementAcceptances_userId", userId
			).put(
				"version", _getVersion(agreementType)
			).toString(),
			UriComponentsBuilder.fromPath(
				"/o/c/p2s3agreementacceptances"
			).build(
			).toUri());
	}

	public String getAgreementContent(String agreementType) throws Exception {
		String url = _getProperty(agreementType, "url");

		if (Validator.isNull(url)) {
			return null;
		}

		Instant instant = Instant.now();

		CachedContent cachedContent = _cachedContents.get(agreementType);

		if ((cachedContent != null) &&
			instant.isBefore(cachedContent._expirationInstant)) {

			return cachedContent._content;
		}

		String content = get(
			Collections.emptyMap(),
			UriComponentsBuilder.fromUriString(
				url
			).queryParam(
				"agreementVersion", _getVersion(agreementType)
			).build(
			).toUri());

		_cachedContents.put(
			agreementType,
			new CachedContent(content, instant.plus(_CACHE_DURATION)));

		return content;
	}

	public JSONObject getAgreementsJSONObject(long userId) throws Exception {
		JSONObject agreementsJSONObject = new JSONObject();

		for (String agreementType : _agreementTypes) {
			agreementsJSONObject.put(
				agreementType,
				new JSONObject(
				).put(
					"accepted", false
				).put(
					"hasContent",
					Validator.isNotNull(_getProperty(agreementType, "url"))
				).put(
					"version", _getVersion(agreementType)
				));
		}

		String json = get(
			_getAuthorization(),
			UriComponentsBuilder.fromPath(
				"/o/c/p2s3agreementacceptances"
			).queryParam(
				"filter",
				"r_lUserToP2S3AgreementAcceptances_userId eq '" + userId + "'"
			).queryParam(
				"pageSize", 100
			).build(
			).toUri());

		if (json == null) {
			throw new Exception(
				"Unable to get agreement acceptances for user " + userId);
		}

		JSONArray itemsJSONArray = new JSONObject(
			json
		).getJSONArray(
			"items"
		);

		for (int i = 0; i < itemsJSONArray.length(); i++) {
			JSONObject itemJSONObject = itemsJSONArray.getJSONObject(i);

			JSONObject agreementTypeJSONObject = itemJSONObject.optJSONObject(
				"agreementType");

			if (agreementTypeJSONObject == null) {
				continue;
			}

			JSONObject agreementJSONObject = agreementsJSONObject.optJSONObject(
				agreementTypeJSONObject.optString("key"));

			if ((agreementJSONObject != null) &&
				_isAcceptedVersion(
					itemJSONObject.optString("version"),
					agreementJSONObject.getString("version"))) {

				agreementJSONObject.put("accepted", true);
			}
		}

		return agreementsJSONObject;
	}

	public boolean isAgreementType(String agreementType) {
		return _agreementTypes.contains(agreementType);
	}

	private String _getAuthorization() {
		return _liferayOAuth2AccessTokenManager.getAuthorization(
			"liferay-learn-etc-spring-boot-oahs");
	}

	private String _getProperty(String agreementType, String name) {
		return _environment.getProperty(
			StringBundler.concat(
				"liferay.learn.downloads.agreement.", agreementType, ".", name),
			"");
	}

	private String _getVersion(String agreementType) {
		return _getProperty(agreementType, "version");
	}

	private boolean _isAcceptedVersion(
		String acceptedVersion, String requiredVersion) {

		if (Validator.isNull(requiredVersion)) {
			return true;
		}

		try {
			BigDecimal acceptedBigDecimal = new BigDecimal(acceptedVersion);

			if (acceptedBigDecimal.compareTo(new BigDecimal(requiredVersion)) >=
					0) {

				return true;
			}

			return false;
		}
		catch (NumberFormatException numberFormatException) {
			if (_log.isDebugEnabled()) {
				_log.debug(numberFormatException);
			}

			return acceptedVersion.equals(requiredVersion);
		}
	}

	private static final Duration _CACHE_DURATION = Duration.ofHours(1);

	private static final Log _log = LogFactory.getLog(
		DownloadAgreementsService.class);

	private static final List<String> _agreementTypes = List.of(
		"esa", "evaluationEula", "studioEula");

	private final Map<String, CachedContent> _cachedContents =
		new ConcurrentHashMap<>();

	@Autowired
	private Environment _environment;

	@Autowired
	private LiferayOAuth2AccessTokenManager _liferayOAuth2AccessTokenManager;

	private static class CachedContent {

		private CachedContent(String content, Instant expirationInstant) {
			_content = content;
			_expirationInstant = expirationInstant;
		}

		private final String _content;
		private final Instant _expirationInstant;

	}

}