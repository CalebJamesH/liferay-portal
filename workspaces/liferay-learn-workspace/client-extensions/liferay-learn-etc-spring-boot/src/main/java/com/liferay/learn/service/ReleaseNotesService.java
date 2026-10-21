/**
 * SPDX-FileCopyrightText: (c) 2026 Liferay, Inc. https://liferay.com
 * SPDX-License-Identifier: LGPL-2.1-or-later OR LicenseRef-Liferay-DXP-EULA-2.0.0-2023-06
 */

package com.liferay.learn.service;

import com.liferay.client.extension.util.spring.boot3.service.BaseService;
import com.liferay.petra.string.StringBundler;
import com.liferay.petra.string.StringPool;
import com.liferay.portal.kernel.util.GetterUtil;

import java.time.Duration;
import java.time.Instant;

import java.util.ArrayList;
import java.util.Collections;
import java.util.Comparator;
import java.util.HashSet;
import java.util.LinkedHashMap;
import java.util.List;
import java.util.Map;
import java.util.Set;
import java.util.regex.Matcher;
import java.util.regex.Pattern;
import java.util.stream.Collectors;

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
public class ReleaseNotesService extends BaseService {

	public synchronized JSONArray getProductVersionsJSONArray()
		throws Exception {

		Instant instant = Instant.now();

		if ((_productVersionsJSONArray == null) ||
			!instant.isBefore(_productVersionsExpirationInstant)) {

			_refreshProductVersions(instant);
		}

		return _productVersionsJSONArray;
	}

	public String getTargetPlatformVersion(String releaseKey) {
		if (!releaseKey.startsWith(_RELEASE_KEY_PREFIX_7_4)) {
			return null;
		}

		String suffix = releaseKey.substring(_RELEASE_KEY_PREFIX_7_4.length());

		Matcher matcher = _updateSuffixPattern.matcher(suffix);

		if (matcher.matches()) {
			return _TARGET_PLATFORM_VERSION_PREFIX_7_4 + suffix;
		}

		matcher = _quarterlyPattern.matcher(suffix);

		if (matcher.matches()) {
			return suffix;
		}

		return null;
	}

	private Set<String> _getBOMVersions() throws Exception {
		String metadata = get(
			Collections.emptyMap(),
			UriComponentsBuilder.fromUriString(
				_bomURL + "/release.dxp.bom/maven-metadata.xml"
			).build(
			).toUri());

		Matcher matcher = _versionPattern.matcher(metadata);

		return matcher.results(
		).map(
			matchResult -> matchResult.group(1)
		).collect(
			Collectors.toSet()
		);
	}

	private String _getQuarterlyProductVersionName(
		String year, String quarter) {

		String name = StringBundler.concat("DXP ", year, ".Q", quarter);

		if (_isLTS(year, quarter)) {
			return name + " (LTS)";
		}

		return name;
	}

	private String _getReleaseKey(String targetPlatformVersion) {
		Matcher matcher = _updatePattern.matcher(targetPlatformVersion);

		if (matcher.matches()) {
			return _RELEASE_KEY_PREFIX_7_4 + "u" + matcher.group(1);
		}

		return _RELEASE_KEY_PREFIX_7_4 + targetPlatformVersion;
	}

	private String _getReleaseName(String targetPlatformVersion) {
		Matcher matcher = _updatePattern.matcher(targetPlatformVersion);

		if (matcher.matches()) {
			return "Update " + matcher.group(1);
		}

		matcher = _quarterlyPattern.matcher(targetPlatformVersion);

		if (!matcher.matches()) {
			return targetPlatformVersion;
		}

		String name = StringBundler.concat(
			matcher.group(1), ".Q", matcher.group(2), StringPool.PERIOD,
			matcher.group(3), " Quarterly Release");

		if (_isLTS(matcher.group(1), matcher.group(2))) {
			return name + " (LTS)";
		}

		return name;
	}

	private Set<String> _getReleasesJSONTargetPlatformVersions()
		throws Exception {

		JSONArray releasesJSONArray = new JSONArray(
			get(
				Collections.emptyMap(),
				UriComponentsBuilder.fromUriString(
					_releasesJSONURL
				).build(
				).toUri()));

		Set<String> targetPlatformVersions = new HashSet<>();

		for (int i = 0; i < releasesJSONArray.length(); i++) {
			JSONObject releaseJSONObject = releasesJSONArray.getJSONObject(i);

			if (_PRODUCT_DXP.equals(releaseJSONObject.optString("product"))) {
				targetPlatformVersions.add(
					releaseJSONObject.optString("targetPlatformVersion"));
			}
		}

		return targetPlatformVersions;
	}

	private long _getSortKey(String releaseKey) {
		String targetPlatformVersion = getTargetPlatformVersion(releaseKey);

		if (targetPlatformVersion == null) {
			return 0;
		}

		Matcher matcher = _quarterlyPattern.matcher(targetPlatformVersion);

		if (matcher.matches()) {
			return (GetterUtil.getLong(matcher.group(1)) * 10000) +
				(GetterUtil.getLong(matcher.group(2)) * 1000) +
					GetterUtil.getLong(matcher.group(3));
		}

		matcher = _updatePattern.matcher(targetPlatformVersion);

		if (matcher.matches()) {
			return GetterUtil.getLong(matcher.group(1));
		}

		return 0;
	}

	private boolean _isLTS(String year, String quarter) {
		if ((GetterUtil.getInteger(quarter) == 1) &&
			(GetterUtil.getInteger(year) >= 2024)) {

			return true;
		}

		return false;
	}

	private void _refreshProductVersions(Instant instant) throws Exception {
		boolean failed = false;

		try {
			_releasesJSONTargetPlatformVersions =
				_getReleasesJSONTargetPlatformVersions();
		}
		catch (Exception exception) {
			failed = true;

			if (_log.isWarnEnabled()) {
				_log.warn(
					"Unable to refresh releases from " + _releasesJSONURL,
					exception);
			}
		}

		try {
			_bomVersions = _getBOMVersions();
		}
		catch (Exception exception) {
			failed = true;

			if (_log.isWarnEnabled()) {
				_log.warn("Unable to refresh BOM versions", exception);
			}
		}

		Set<String> targetPlatformVersions = new HashSet<>(_bomVersions);

		targetPlatformVersions.addAll(_releasesJSONTargetPlatformVersions);

		JSONArray productVersionsJSONArray = new JSONArray();

		for (JSONObject productVersionJSONObject :
				_releaseSnapshotService.getProductVersionJSONObjects()) {

			productVersionsJSONArray.put(productVersionJSONObject);

			if (_PRODUCT_VERSION_7_4.equals(
					productVersionJSONObject.getString("key"))) {

				_addNewerReleases(
					productVersionJSONObject, targetPlatformVersions);

				for (JSONObject quarterlyProductVersionJSONObject :
						_removeQuarterlyReleases(productVersionJSONObject)) {

					productVersionsJSONArray.put(
						quarterlyProductVersionJSONObject);
				}
			}
		}

		_productVersionsJSONArray = productVersionsJSONArray;

		if (failed) {
			_productVersionsExpirationInstant = instant.plus(_RETRY_DURATION);
		}
		else {
			_productVersionsExpirationInstant = instant.plus(_CACHE_DURATION);
		}
	}

	private void _addNewerReleases(
		JSONObject productVersionJSONObject,
		Set<String> targetPlatformVersions) {

		JSONArray releasesJSONArray = productVersionJSONObject.getJSONArray(
			"releases");

		List<JSONObject> releaseJSONObjects = new ArrayList<>();
		Set<String> releaseKeys = new HashSet<>();

		for (int i = 0; i < releasesJSONArray.length(); i++) {
			JSONObject releaseJSONObject = releasesJSONArray.getJSONObject(i);

			releaseJSONObjects.add(releaseJSONObject);
			releaseKeys.add(releaseJSONObject.getString("key"));
		}

		for (String targetPlatformVersion : targetPlatformVersions) {
			Matcher quarterlyMatcher = _quarterlyPattern.matcher(
				targetPlatformVersion);
			Matcher updateMatcher = _updatePattern.matcher(
				targetPlatformVersion);

			if (!quarterlyMatcher.matches() && !updateMatcher.matches()) {
				continue;
			}

			String releaseKey = _getReleaseKey(targetPlatformVersion);

			if (!releaseKeys.add(releaseKey)) {
				continue;
			}

			releaseJSONObjects.add(
				new JSONObject(
				).put(
					"key", releaseKey
				).put(
					"name", _getReleaseName(targetPlatformVersion)
				));
		}

		releaseJSONObjects.sort(
			Comparator.comparingLong(
				releaseJSONObject -> _getSortKey(
					releaseJSONObject.getString("key"))));

		productVersionJSONObject.put(
			"releases", new JSONArray(releaseJSONObjects));
	}

	private List<JSONObject> _removeQuarterlyReleases(
		JSONObject productVersionJSONObject) {

		JSONArray releasesJSONArray = productVersionJSONObject.getJSONArray(
			"releases");

		Map<String, JSONObject> quarterlyProductVersionJSONObjects =
			new LinkedHashMap<>();
		JSONArray updateReleasesJSONArray = new JSONArray();

		for (int i = 0; i < releasesJSONArray.length(); i++) {
			JSONObject releaseJSONObject = releasesJSONArray.getJSONObject(i);

			Matcher matcher = _quarterlyPattern.matcher(
				GetterUtil.getString(
					getTargetPlatformVersion(
						releaseJSONObject.getString("key"))));

			if (!matcher.matches()) {
				updateReleasesJSONArray.put(releaseJSONObject);

				continue;
			}

			String quarter = matcher.group(2);
			String year = matcher.group(1);

			JSONObject quarterlyProductVersionJSONObject =
				quarterlyProductVersionJSONObjects.computeIfAbsent(
					year + ".q" + quarter,
					key -> new JSONObject(
					).put(
						"key", key
					).put(
						"line", _PRODUCT_VERSION_7_4
					).put(
						"name", _getQuarterlyProductVersionName(year, quarter)
					).put(
						"releases", new JSONArray()
					));

			JSONArray quarterlyReleasesJSONArray =
				quarterlyProductVersionJSONObject.getJSONArray("releases");

			quarterlyReleasesJSONArray.put(releaseJSONObject);
		}

		productVersionJSONObject.put("releases", updateReleasesJSONArray);

		return new ArrayList<>(quarterlyProductVersionJSONObjects.values());
	}

	private static final Duration _CACHE_DURATION = Duration.ofHours(1);

	private static final String _PRODUCT_DXP = "dxp";

	private static final String _PRODUCT_VERSION_7_4 = "7.4";

	private static final String _RELEASE_KEY_PREFIX_7_4 = "7413-";

	private static final Duration _RETRY_DURATION = Duration.ofMinutes(5);

	private static final String _TARGET_PLATFORM_VERSION_PREFIX_7_4 = "7.4.13.";

	private static final Log _log = LogFactory.getLog(
		ReleaseNotesService.class);

	private static final Pattern _quarterlyPattern = Pattern.compile(
		"(\\d{4})\\.q(\\d)\\.(\\d+)");
	private static final Pattern _updatePattern = Pattern.compile(
		"7\\.4\\.13\\.u(\\d+)");
	private static final Pattern _updateSuffixPattern = Pattern.compile(
		"u\\d+");
	private static final Pattern _versionPattern = Pattern.compile(
		"<version>([^<]*)</version>");

	private Set<String> _bomVersions = new HashSet<>();
	private Instant _productVersionsExpirationInstant;
	private JSONArray _productVersionsJSONArray;
	private Set<String> _releasesJSONTargetPlatformVersions = new HashSet<>();

	@Value("${liferay.learn.release.notes.bom.url}")
	private String _bomURL;

	@Value("${liferay.learn.release.notes.releases.json.url}")
	private String _releasesJSONURL;

	@Autowired
	private ReleaseSnapshotService _releaseSnapshotService;

}