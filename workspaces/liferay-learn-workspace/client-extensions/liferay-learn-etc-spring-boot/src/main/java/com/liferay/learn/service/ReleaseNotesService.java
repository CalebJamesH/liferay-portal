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
import java.util.Objects;
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

	public JSONObject getProductVersionJSONObject(String releaseKey)
		throws Exception {

		JSONArray productVersionsJSONArray = getProductVersionsJSONArray();

		for (int i = 0; i < productVersionsJSONArray.length(); i++) {
			JSONObject productVersionJSONObject =
				productVersionsJSONArray.getJSONObject(i);

			JSONArray releasesJSONArray = productVersionJSONObject.getJSONArray(
				"releases");

			for (int j = 0; j < releasesJSONArray.length(); j++) {
				JSONObject releaseJSONObject = releasesJSONArray.getJSONObject(
					j);

				if (Objects.equals(
						releaseKey, releaseJSONObject.getString("key"))) {

					return productVersionJSONObject;
				}
			}
		}

		return null;
	}

	public synchronized JSONArray getProductVersionsJSONArray()
		throws Exception {

		Instant instant = Instant.now();

		if ((_productVersionsJSONArray == null) ||
			!instant.isBefore(_productVersionsExpirationInstant)) {

			_loadProductVersions(instant);
		}

		return _productVersionsJSONArray;
	}

	public List<String> getReleaseKeys(
			String fromReleaseKey, String toReleaseKey)
		throws Exception {

		JSONArray productVersionsJSONArray = getProductVersionsJSONArray();

		String line = null;
		List<String> releaseKeys = new ArrayList<>();

		for (int i = 0; i < productVersionsJSONArray.length(); i++) {
			JSONObject productVersionJSONObject =
				productVersionsJSONArray.getJSONObject(i);

			if ((line != null) &&
				!Objects.equals(
					line, productVersionJSONObject.getString("line"))) {

				continue;
			}

			JSONArray releasesJSONArray = productVersionJSONObject.getJSONArray(
				"releases");

			for (int j = 0; j < releasesJSONArray.length(); j++) {
				JSONObject releaseJSONObject = releasesJSONArray.getJSONObject(
					j);

				String releaseKey = releaseJSONObject.getString("key");

				if (line == null) {
					if (!Objects.equals(fromReleaseKey, releaseKey)) {
						continue;
					}

					line = productVersionJSONObject.getString("line");
				}

				releaseKeys.add(releaseKey);

				if (Objects.equals(releaseKey, toReleaseKey)) {
					return releaseKeys;
				}
			}
		}

		return null;
	}

	public String getTargetPlatformVersion(String releaseKey) {
		if (!releaseKey.startsWith(_RELEASE_KEY_PREFIX_7_4)) {
			return null;
		}

		String suffix = releaseKey.substring(_RELEASE_KEY_PREFIX_7_4.length());

		Matcher matcher = _updateSuffixPattern.matcher(suffix);

		if (matcher.matches()) {
			return "7.4.13." + suffix;
		}

		matcher = _dxpQuarterlyPattern.matcher(suffix);

		if (matcher.matches()) {
			return suffix;
		}

		return null;
	}

	public boolean isQuarterlyRelease(String releaseKey) {
		Matcher matcher = _dxpQuarterlyPattern.matcher(
			GetterUtil.getString(getTargetPlatformVersion(releaseKey)));

		return matcher.matches();
	}

	private Set<String> _getBOMVersions() throws Exception {
		String mavenMetadata = get(
			Collections.emptyMap(),
			UriComponentsBuilder.fromUriString(
				_bomURL + "/release.dxp.bom/maven-metadata.xml"
			).build(
			).toUri());

		Matcher matcher = _versionPattern.matcher(mavenMetadata);

		return matcher.results(
		).map(
			matchResult -> matchResult.group(1)
		).collect(
			Collectors.toSet()
		);
	}

	private String _getQuarterlyReleaseName(String quarter, String year) {
		String quarterlyReleaseName = StringBundler.concat(
			"DXP ", year, ".Q", quarter);

		if (_isLTS(year, quarter)) {
			return quarterlyReleaseName + " (LTS)";
		}

		return quarterlyReleaseName;
	}

	private String _getReleaseKey(String platformVersion) {
		Matcher matcher = _dxpUpdatePattern.matcher(platformVersion);

		if (matcher.matches()) {
			return _RELEASE_KEY_PREFIX_7_4 + "u" + matcher.group(1);
		}

		return _RELEASE_KEY_PREFIX_7_4 + platformVersion;
	}

	private String _getReleaseName(String platformVersion) {
		Matcher matcher = _dxpUpdatePattern.matcher(platformVersion);

		if (matcher.matches()) {
			return "Update " + matcher.group(1);
		}

		matcher = _dxpQuarterlyPattern.matcher(platformVersion);

		if (!matcher.matches()) {
			return platformVersion;
		}

		String releaseName = StringBundler.concat(
			matcher.group(1), ".Q", matcher.group(2), StringPool.PERIOD,
			matcher.group(3), " Quarterly Release");

		if (_isLTS(matcher.group(1), matcher.group(2))) {
			return releaseName + " (LTS)";
		}

		return releaseName;
	}

	private Set<String> _getTargetPlatformVersions() throws Exception {
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

			if (Objects.equals(releaseJSONObject.optString("product"), "dxp")) {
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

		Matcher matcher = _dxpQuarterlyPattern.matcher(targetPlatformVersion);

		if (matcher.matches()) {
			return (GetterUtil.getLong(matcher.group(1)) * 10000) +
				(GetterUtil.getLong(matcher.group(2)) * 1000) +
					GetterUtil.getLong(matcher.group(3));
		}

		matcher = _dxpUpdatePattern.matcher(targetPlatformVersion);

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

	private void _loadProductVersions(Instant instant) throws Exception {
		boolean failed = false;

		try {
			_targetPlatformVersions = _getTargetPlatformVersions();
		}
		catch (Exception exception) {
			failed = true;

			if (_log.isWarnEnabled()) {
				_log.warn(
					"Unable to load releases from " + _releasesJSONURL,
					exception);
			}
		}

		try {
			_bomVersions = _getBOMVersions();
		}
		catch (Exception exception) {
			failed = true;

			if (_log.isWarnEnabled()) {
				_log.warn("Unable to load BOM versions", exception);
			}
		}

		Set<String> platformVersions = new HashSet<>(_bomVersions);

		platformVersions.addAll(_targetPlatformVersions);

		JSONArray productVersionsJSONArray = new JSONArray();

		for (JSONObject productVersionJSONObject :
				_releaseSnapshotService.getProductVersionJSONObjects()) {

			productVersionsJSONArray.put(productVersionJSONObject);

			if (!Objects.equals(
					_PRODUCT_VERSION_7_4,
					productVersionJSONObject.getString("key"))) {

				continue;
			}

			_addMissingReleases(productVersionJSONObject, platformVersions);

			for (JSONObject quarterlyProductVersionJSONObject :
					_removeQuarterlyReleases(productVersionJSONObject)) {

				productVersionsJSONArray.put(quarterlyProductVersionJSONObject);
			}
		}

		_productVersionsJSONArray = productVersionsJSONArray;

		if (failed) {
			_productVersionsExpirationInstant = instant.plus(
				Duration.ofMinutes(5));
		}
		else {
			_productVersionsExpirationInstant = instant.plus(
				Duration.ofHours(1));
		}
	}

	private void _addMissingReleases(
		JSONObject productVersionJSONObject, Set<String> platformVersions) {

		JSONArray releasesJSONArray = productVersionJSONObject.getJSONArray(
			"releases");

		List<JSONObject> releaseJSONObjects = new ArrayList<>();
		Set<String> releaseKeys = new HashSet<>();

		for (int i = 0; i < releasesJSONArray.length(); i++) {
			JSONObject releaseJSONObject = releasesJSONArray.getJSONObject(i);

			releaseJSONObjects.add(releaseJSONObject);
			releaseKeys.add(releaseJSONObject.getString("key"));
		}

		for (String platformVersion : platformVersions) {
			Matcher quarterlyMatcher = _dxpQuarterlyPattern.matcher(
				platformVersion);
			Matcher updateMatcher = _dxpUpdatePattern.matcher(platformVersion);

			if (updateMatcher.matches()) {
				if (GetterUtil.getInteger(updateMatcher.group(1)) > 92) {
					continue;
				}
			}
			else if (!quarterlyMatcher.matches()) {
				continue;
			}

			String releaseKey = _getReleaseKey(platformVersion);

			if (releaseKeys.contains(releaseKey)) {
				continue;
			}

			releaseJSONObjects.add(
				new JSONObject(
				).put(
					"key", releaseKey
				).put(
					"name", _getReleaseName(platformVersion)
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

			Matcher matcher = _dxpQuarterlyPattern.matcher(
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
						"name", _getQuarterlyReleaseName(quarter, year)
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

	private static final String _PRODUCT_VERSION_7_4 = "7.4";

	private static final String _RELEASE_KEY_PREFIX_7_4 = "7413-";

	private static final Log _log = LogFactory.getLog(
		ReleaseNotesService.class);

	private static final Pattern _dxpQuarterlyPattern = Pattern.compile(
		"(\\d{4})\\.q(\\d)\\.(\\d+)");
	private static final Pattern _dxpUpdatePattern = Pattern.compile(
		"7\\.4\\.13\\.u(\\d+)");
	private static final Pattern _updateSuffixPattern = Pattern.compile(
		"u\\d+");
	private static final Pattern _versionPattern = Pattern.compile(
		"<version>([^<]*)</version>");

	private Set<String> _bomVersions = new HashSet<>();
	private Instant _productVersionsExpirationInstant;
	private JSONArray _productVersionsJSONArray;
	private Set<String> _targetPlatformVersions = new HashSet<>();

	@Value("${liferay.learn.release.notes.bom.url}")
	private String _bomURL;

	@Value("${liferay.learn.release.notes.releases.json.url}")
	private String _releasesJSONURL;

	@Autowired
	private ReleaseSnapshotService _releaseSnapshotService;

}