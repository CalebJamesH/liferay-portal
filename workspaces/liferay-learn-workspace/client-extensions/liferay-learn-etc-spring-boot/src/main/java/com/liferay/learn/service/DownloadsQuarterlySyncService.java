/**
 * SPDX-FileCopyrightText: (c) 2026 Liferay, Inc. https://liferay.com
 * SPDX-License-Identifier: LGPL-2.1-or-later OR LicenseRef-Liferay-DXP-EULA-2.0.0-2023-06
 */

package com.liferay.learn.service;

import com.liferay.client.extension.util.spring.boot3.client.LiferayOAuth2AccessTokenManager;
import com.liferay.client.extension.util.spring.boot3.service.BaseService;
import com.liferay.petra.string.StringBundler;
import com.liferay.portal.kernel.util.GetterUtil;
import com.liferay.portal.kernel.util.StringUtil;
import com.liferay.portal.kernel.util.Validator;

import java.io.StringReader;

import java.math.BigDecimal;
import java.math.RoundingMode;

import java.time.Instant;
import java.time.LocalDate;
import java.time.ZoneOffset;

import java.util.ArrayList;
import java.util.Base64;
import java.util.Collections;
import java.util.HashMap;
import java.util.HexFormat;
import java.util.List;
import java.util.Map;
import java.util.Properties;
import java.util.regex.Matcher;
import java.util.regex.Pattern;

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
public class DownloadsQuarterlySyncService extends BaseService {

	public synchronized List<String> synchronize() throws Exception {
		Map<String, QuarterlyRelease> quarterlyReleases = new HashMap<>();

		for (JSONObject downloadJSONObject :
				_downloadsService.getFreshDownloadJSONObjects()) {

			QuarterlyRelease quarterlyRelease = QuarterlyRelease.of(
				downloadJSONObject.optString("releaseKey"));

			if (quarterlyRelease == null) {
				continue;
			}

			quarterlyReleases.put(quarterlyRelease._key, quarterlyRelease);

			quarterlyRelease._downloadJSONObject = downloadJSONObject;
		}

		boolean updated = false;

		for (QuarterlyRelease quarterlyRelease : quarterlyReleases.values()) {
			try {
				if (_updateChecksums(quarterlyRelease)) {
					updated = true;
				}
			}
			catch (Exception exception) {
				_log.error(
					"Unable to update checksums of " + quarterlyRelease._key,
					exception);
			}
		}

		List<String> titles = new ArrayList<>();

		for (QuarterlyRelease quarterlyRelease : _getNewQuarterlyReleases()) {
			if (quarterlyReleases.containsKey(quarterlyRelease._key)) {
				continue;
			}

			String title = _addDownload(
				quarterlyRelease,
				_getTemplateQuarterlyRelease(
					quarterlyRelease, quarterlyReleases.values()));

			if (title != null) {
				titles.add(title);
			}
		}

		if (!titles.isEmpty() || updated) {
			_downloadsService.clearCache();
		}

		return titles;
	}

	private String _addDownload(
			QuarterlyRelease quarterlyRelease,
			QuarterlyRelease templateQuarterlyRelease)
		throws Exception {

		JSONArray itemsJSONArray = _getReleaseFilesJSONArray(
			quarterlyRelease._version);

		Properties releaseProperties = _getReleaseProperties(
			quarterlyRelease._version);

		String buildTimestamp = _getBuildTimestamp(
			itemsJSONArray, releaseProperties);

		List<JSONObject> fileJSONObjects = new ArrayList<>();
		String releaseDate = null;

		for (int i = 0; i < itemsJSONArray.length(); i++) {
			JSONObject itemJSONObject = itemsJSONArray.getJSONObject(i);

			String fileName = StringUtil.extractLast(
				itemJSONObject.getString("name"), '/');

			if ((buildTimestamp != null) &&
				!_isBuild(buildTimestamp, fileName)) {

				continue;
			}

			for (ReleaseFile releaseFile : _releaseFiles) {
				Matcher matcher = releaseFile._pattern.matcher(fileName);

				if (!matcher.matches()) {
					continue;
				}

				String url = StringBundler.concat(
					_releasesDownloadURL, "/", quarterlyRelease._version, "/",
					fileName);

				fileJSONObjects.add(
					new JSONObject(
					).put(
						"groupName", releaseFile._groupName
					).put(
						"md5",
						_getMD5(itemJSONObject.optString("md5Hash"), url)
					).put(
						"name", releaseFile._name
					).put(
						"priority", releaseFile._priority
					).put(
						"sha512",
						_getSHA512(itemJSONObject.optString("md5Hash"), url)
					).put(
						"size", _getSize(itemJSONObject.optLong("size"))
					).put(
						"url", url
					));

				String timeCreated = itemJSONObject.optString("timeCreated");

				if (Validator.isNotNull(timeCreated) &&
					((releaseDate == null) ||
					 (timeCreated.compareTo(releaseDate) < 0))) {

					releaseDate = timeCreated;
				}

				break;
			}
		}

		if (fileJSONObjects.isEmpty()) {
			if (_log.isInfoEnabled()) {
				_log.info(
					"No release files found for " + quarterlyRelease._key);
			}

			return null;
		}

		if (releaseDate == null) {
			releaseDate = Instant.now(
			).toString();
		}

		releaseDate = LocalDate.ofInstant(
			Instant.parse(releaseDate), ZoneOffset.UTC
		).toString();

		String generalAvailabilityDate = _getGeneralAvailabilityDate(
			releaseProperties, quarterlyRelease._version);

		if (generalAvailabilityDate != null) {
			releaseDate = generalAvailabilityDate;
		}

		JSONObject templateDownloadJSONObject =
			(templateQuarterlyRelease == null) ? new JSONObject() :
				templateQuarterlyRelease._downloadJSONObject;

		String title = _getTitle(quarterlyRelease);

		String erc = quarterlyRelease._version.replaceAll("[^A-Za-z0-9]", "_");

		String externalReferenceCode =
			"DXP_QUARTERLY_" + StringUtil.toUpperCase(erc);

		JSONArray fileTypesJSONArray = new JSONArray(
		).put(
			_getKeyJSONObject("patchRelease")
		);

		if (quarterlyRelease._first) {
			fileTypesJSONArray.put(_getKeyJSONObject("quarterlyReleases"));
		}

		JSONObject downloadJSONObject = new JSONObject(
		).put(
			"downloadNumber",
			templateDownloadJSONObject.optLong("downloadNumber")
		).put(
			"externalReferenceCode", externalReferenceCode
		).put(
			"fileTypes", fileTypesJSONArray
		).put(
			"product", _getKeyJSONObject("dxpQuarterlyReleases")
		).put(
			"releaseDate", releaseDate
		).put(
			"releaseKey", quarterlyRelease._key
		).put(
			"title", title
		).put(
			"urlTitle", _getURLTitle(title)
		);

		String requiredAgreement = templateDownloadJSONObject.optString(
			"requiredAgreement", "esa");

		if (Validator.isNotNull(requiredAgreement)) {
			downloadJSONObject.put(
				"requiredAgreement", _getKeyJSONObject(requiredAgreement));
		}

		String authorization = _getAuthorization();

		JSONObject objectEntryJSONObject = new JSONObject(
			put(
				authorization, downloadJSONObject.toString(),
				UriComponentsBuilder.fromPath(
					"/o/c/p2s3downloads/by-external-reference-code/{erc}"
				).buildAndExpand(
					externalReferenceCode
				).toUri()));

		long downloadId = objectEntryJSONObject.getLong("id");

		for (int i = 0; i < fileJSONObjects.size(); i++) {
			JSONObject fileJSONObject = fileJSONObjects.get(i);

			fileJSONObject.put(
				"r_p2s3DownloadToP2S3DownloadFiles_c_p2s3DownloadId",
				downloadId);

			put(
				authorization, fileJSONObject.toString(),
				UriComponentsBuilder.fromPath(
					"/o/c/p2s3downloadfiles/by-external-reference-code/{erc}"
				).buildAndExpand(
					externalReferenceCode + "_FILE_" + i
				).toUri());
		}

		JSONArray linksJSONArray = templateDownloadJSONObject.optJSONArray(
			"links");

		if (linksJSONArray != null) {
			for (int i = 0; i < linksJSONArray.length(); i++) {
				JSONObject linkJSONObject = linksJSONArray.getJSONObject(i);

				put(
					authorization,
					new JSONObject(
					).put(
						"label", linkJSONObject.optString("label")
					).put(
						"priority", i
					).put(
						"r_p2s3DownloadToP2S3DownloadLinks_c_p2s3DownloadId",
						downloadId
					).put(
						"url",
						_replaceVersion(
							linkJSONObject.optString("url"), quarterlyRelease,
							templateQuarterlyRelease)
					).toString(),
					UriComponentsBuilder.fromPath(
						"/o/c/p2s3downloadlinks/by-external-reference-code" +
							"/{erc}"
					).buildAndExpand(
						externalReferenceCode + "_LINK_" + i
					).toUri());
			}
		}

		if (_log.isInfoEnabled()) {
			_log.info("Added download " + title);
		}

		return title;
	}

	private String _getAuthorization() {
		return _liferayOAuth2AccessTokenManager.getAuthorization(
			"liferay-learn-etc-spring-boot-oahs");
	}

	private String _getBuildTimestamp(
		JSONArray itemsJSONArray, Properties releaseProperties) {

		String buildTimestamp = StringUtil.trim(
			releaseProperties.getProperty("build.timestamp"));

		if (Validator.isNull(buildTimestamp) ||
			!buildTimestamp.matches("\\d+")) {

			return null;
		}

		for (int i = 0; i < itemsJSONArray.length(); i++) {
			JSONObject itemJSONObject = itemsJSONArray.getJSONObject(i);

			String fileName = StringUtil.extractLast(
				itemJSONObject.getString("name"), '/');

			if (!_isBuild(buildTimestamp, fileName)) {
				continue;
			}

			for (ReleaseFile releaseFile : _releaseFiles) {
				Matcher matcher = releaseFile._pattern.matcher(fileName);

				if (matcher.matches()) {
					return buildTimestamp;
				}
			}
		}

		return null;
	}

	private String _getChecksum(String url, String extension, int length) {
		try {
			String checksum = get(
				Collections.emptyMap(),
				UriComponentsBuilder.fromUriString(
					url + extension
				).build(
				).toUri());

			if (checksum == null) {
				return "";
			}

			String[] parts = checksum.trim(
			).split(
				"\\s+"
			);

			if (!parts[0].matches("[0-9A-Fa-f]{" + length + "}")) {
				return "";
			}

			return parts[0];
		}
		catch (Exception exception) {
			if (_log.isDebugEnabled()) {
				_log.debug("Unable to get " + url + extension, exception);
			}

			return "";
		}
	}

	private String _getGeneralAvailabilityDate(
		Properties properties, String version) {

		try {
			String date = properties.getProperty(
				"general.availability.date",
				properties.getProperty("release.date"));

			if (Validator.isNull(date)) {
				return null;
			}

			return LocalDate.parse(
				date.trim()
			).toString();
		}
		catch (Exception exception) {
			if (_log.isInfoEnabled()) {
				_log.info(
					"Unable to get the general availability date of " + version,
					exception);
			}

			return null;
		}
	}

	private JSONObject _getKeyJSONObject(String key) {
		return new JSONObject(
		).put(
			"key", key
		);
	}

	private String _getMD5(String md5Hash, String url) {
		if (Validator.isNull(md5Hash)) {
			return StringUtil.toUpperCase(_getChecksum(url, ".MD5", 32));
		}

		HexFormat hexFormat = HexFormat.of();

		return hexFormat.withUpperCase(
		).formatHex(
			Base64.getDecoder(
			).decode(
				md5Hash
			)
		);
	}

	private List<QuarterlyRelease> _getNewQuarterlyReleases() throws Exception {
		JSONArray releasesJSONArray = new JSONArray(
			get(
				Collections.emptyMap(),
				UriComponentsBuilder.fromUriString(
					_releasesJSONURL
				).build(
				).toUri()));

		List<QuarterlyRelease> quarterlyReleases = new ArrayList<>();

		for (int i = 0; i < releasesJSONArray.length(); i++) {
			JSONObject releaseJSONObject = releasesJSONArray.getJSONObject(i);

			QuarterlyRelease quarterlyRelease = QuarterlyRelease.of(
				releaseJSONObject.optString("releaseKey"));

			if (quarterlyRelease == null) {
				continue;
			}

			quarterlyReleases.add(quarterlyRelease);
		}

		Map<String, Integer> minPatches = new HashMap<>();

		for (QuarterlyRelease quarterlyRelease : quarterlyReleases) {
			minPatches.merge(
				quarterlyRelease._line, quarterlyRelease._patch, Math::min);
		}

		for (QuarterlyRelease quarterlyRelease : quarterlyReleases) {
			quarterlyRelease._first =
				quarterlyRelease._patch ==
					minPatches.get(quarterlyRelease._line);
		}

		return quarterlyReleases;
	}

	private JSONArray _getReleaseFilesJSONArray(String version)
		throws Exception {

		JSONObject jsonObject = new JSONObject(
			get(
				Collections.emptyMap(),
				UriComponentsBuilder.fromUriString(
					_releasesFilesURL
				).queryParam(
					"fields", "items(md5Hash,name,size,timeCreated)"
				).queryParam(
					"prefix", "dxp/" + version + "/"
				).build(
				).toUri()));

		JSONArray itemsJSONArray = jsonObject.optJSONArray("items");

		if (itemsJSONArray == null) {
			return new JSONArray();
		}

		return itemsJSONArray;
	}

	private Properties _getReleaseProperties(String version) {
		Properties properties = new Properties();

		try {
			properties.load(
				new StringReader(
					get(
						Collections.emptyMap(),
						UriComponentsBuilder.fromUriString(
							StringBundler.concat(
								_releasesDownloadURL, "/", version,
								"/release.properties")
						).build(
						).toUri())));
		}
		catch (Exception exception) {
			if (_log.isInfoEnabled()) {
				_log.info(
					"Unable to get the release properties of " + version,
					exception);
			}
		}

		return properties;
	}

	private String _getSHA512(String md5Hash, String url) {
		if (Validator.isNotNull(md5Hash)) {
			String md5 = _getChecksum(url, ".MD5", 32);

			if (Validator.isNotNull(md5) &&
				!StringUtil.equalsIgnoreCase(md5, _getMD5(md5Hash, url))) {

				if (_log.isWarnEnabled()) {
					_log.warn(
						"Ignoring SHA-512 because the MD5 file is stale for " +
							url);
				}

				return "";
			}
		}

		return _getChecksum(url, ".sha512", 128);
	}

	private String _getSize(long size) {
		if (size >= _GB) {
			return _getSize(size, _GB, " GB");
		}

		if (size >= _MB) {
			return _getSize(size, _MB, " MB");
		}

		return _getSize(size, _KB, " KB");
	}

	private String _getSize(long size, long unit, String suffix) {
		BigDecimal bigDecimal = BigDecimal.valueOf(size);

		bigDecimal = bigDecimal.divide(
			BigDecimal.valueOf(unit), 2, RoundingMode.HALF_UP);

		return bigDecimal.toPlainString() + suffix;
	}

	private QuarterlyRelease _getTemplateQuarterlyRelease(
		QuarterlyRelease quarterlyRelease,
		Iterable<QuarterlyRelease> quarterlyReleases) {

		QuarterlyRelease lineTemplateQuarterlyRelease = null;
		QuarterlyRelease newestTemplateQuarterlyRelease = null;

		for (QuarterlyRelease templateQuarterlyRelease : quarterlyReleases) {
			if (templateQuarterlyRelease._line.equals(quarterlyRelease._line) &&
				((lineTemplateQuarterlyRelease == null) ||
				 (lineTemplateQuarterlyRelease._patch <
					 templateQuarterlyRelease._patch))) {

				lineTemplateQuarterlyRelease = templateQuarterlyRelease;
			}

			if (newestTemplateQuarterlyRelease == null) {
				newestTemplateQuarterlyRelease = templateQuarterlyRelease;

				continue;
			}

			String releaseDate = templateQuarterlyRelease._getReleaseDate();

			int value = releaseDate.compareTo(
				newestTemplateQuarterlyRelease._getReleaseDate());

			if (value > 0) {
				newestTemplateQuarterlyRelease = templateQuarterlyRelease;
			}
		}

		if (lineTemplateQuarterlyRelease != null) {
			return lineTemplateQuarterlyRelease;
		}

		return newestTemplateQuarterlyRelease;
	}

	private String _getTitle(QuarterlyRelease quarterlyRelease) {
		String title = StringBundler.concat(
			"DXP ", quarterlyRelease._getDisplayVersion(), " Quarterly Release");

		if (quarterlyRelease._line.endsWith(".q1")) {
			title += " (LTS)";
		}

		return title;
	}

	private String _getURLTitle(String title) {
		String urlTitle = StringUtil.toLowerCase(title);

		urlTitle = urlTitle.replaceAll("[^a-z0-9]+", "-");

		return urlTitle.replaceAll("^-|-$", "");
	}

	private boolean _isBuild(String buildTimestamp, String fileName) {
		return fileName.contains("-" + buildTimestamp + ".");
	}

	private String _replaceVersion(
		String url, QuarterlyRelease quarterlyRelease,
		QuarterlyRelease templateQuarterlyRelease) {

		if (templateQuarterlyRelease == null) {
			return url;
		}

		url = StringUtil.replace(
			url, templateQuarterlyRelease._getTag(),
			quarterlyRelease._getTag());

		return StringUtil.replace(
			url, templateQuarterlyRelease._getDisplayVersion(),
			quarterlyRelease._getDisplayVersion());
	}

	private boolean _updateChecksums(QuarterlyRelease quarterlyRelease)
		throws Exception {

		JSONArray fileGroupsJSONArray =
			quarterlyRelease._downloadJSONObject.optJSONArray("fileGroups");

		if (fileGroupsJSONArray == null) {
			return false;
		}

		Map<String, JSONObject> itemJSONObjects = new HashMap<>();

		JSONArray itemsJSONArray = _getReleaseFilesJSONArray(
			quarterlyRelease._version);

		for (int i = 0; i < itemsJSONArray.length(); i++) {
			JSONObject itemJSONObject = itemsJSONArray.getJSONObject(i);

			itemJSONObjects.put(
				StringBundler.concat(
					_releasesDownloadURL, "/", quarterlyRelease._version, "/",
					StringUtil.extractLast(
						itemJSONObject.getString("name"), '/')),
				itemJSONObject);
		}

		boolean updated = false;

		for (int i = 0; i < fileGroupsJSONArray.length(); i++) {
			JSONObject fileGroupJSONObject = fileGroupsJSONArray.getJSONObject(
				i);

			JSONArray filesJSONArray = fileGroupJSONObject.optJSONArray(
				"files");

			if (filesJSONArray == null) {
				continue;
			}

			for (int j = 0; j < filesJSONArray.length(); j++) {
				JSONObject fileJSONObject = filesJSONArray.getJSONObject(j);

				String url = fileJSONObject.optString("url");

				JSONObject itemJSONObject = itemJSONObjects.get(url);

				if (itemJSONObject == null) {
					continue;
				}

				String md5 = _getMD5(itemJSONObject.optString("md5Hash"), url);

				if (Validator.isNull(md5)) {
					continue;
				}

				String sha512 = null;

				if (StringUtil.equalsIgnoreCase(
						md5, fileJSONObject.optString("md5"))) {

					if (Validator.isNotNull(
							fileJSONObject.optString("sha512"))) {

						continue;
					}

					sha512 = _getSHA512(
						itemJSONObject.optString("md5Hash"), url);

					if (Validator.isNull(sha512)) {
						continue;
					}
				}
				else {
					sha512 = _getSHA512(
						itemJSONObject.optString("md5Hash"), url);
				}

				patch(
					_getAuthorization(),
					new JSONObject(
					).put(
						"md5", md5
					).put(
						"sha512", sha512
					).put(
						"size", _getSize(itemJSONObject.optLong("size"))
					).toString(),
					UriComponentsBuilder.fromPath(
						"/o/c/p2s3downloadfiles/" + fileJSONObject.getLong("id")
					).build(
					).toUri());

				if (_log.isInfoEnabled()) {
					_log.info("Updated checksums of " + url);
				}

				updated = true;
			}
		}

		return updated;
	}

	private static final long _GB = 1024L * 1024L * 1024L;

	private static final long _KB = 1024L;

	private static final long _MB = 1024L * 1024L;

	private static final Log _log = LogFactory.getLog(
		DownloadsQuarterlySyncService.class);

	private static final List<ReleaseFile> _releaseFiles = List.of(
		new ReleaseFile(
			"Bundle", "Bundled with Tomcat (tar.gz)",
			"liferay-dxp-tomcat-.+\\.tar\\.gz", 0),
		new ReleaseFile(
			"Bundle", "Bundled with Tomcat (7-Zip)",
			"liferay-dxp-tomcat-.+\\.7z", 1),
		new ReleaseFile(
			"Additional Files", "OSGi Dependencies",
			"liferay-dxp-osgi-.+\\.zip", 2),
		new ReleaseFile(
			"Additional Files", "Weblogic WAR",
			"liferay-dxp-\\d.+-weblogic-.+\\.war", 4),
		new ReleaseFile(
			"Additional Files", "DXP WAR", "liferay-dxp-\\d.+\\.war", 3),
		new ReleaseFile(
			"Additional Files", "Admin Tools", "liferay-dxp-tools-.+\\.zip",
			5));

	@Autowired
	private DownloadsService _downloadsService;

	@Autowired
	private LiferayOAuth2AccessTokenManager _liferayOAuth2AccessTokenManager;

	@Value("${liferay.learn.downloads.quarterly.releases.download.url}")
	private String _releasesDownloadURL;

	@Value("${liferay.learn.downloads.quarterly.releases.files.url}")
	private String _releasesFilesURL;

	@Value("${liferay.learn.release.notes.releases.json.url}")
	private String _releasesJSONURL;

	private static class QuarterlyRelease {

		public static QuarterlyRelease of(String releaseKey) {
			if (Validator.isNull(releaseKey)) {
				return null;
			}

			Matcher matcher = _pattern.matcher(releaseKey);

			if (!matcher.matches()) {
				return null;
			}

			return new QuarterlyRelease(
				releaseKey, matcher.group(1) + ".q" + matcher.group(2),
				GetterUtil.getInteger(matcher.group(3)));
		}

		private QuarterlyRelease(String key, String line, int patch) {

			_key = key;
			_line = line;
			_patch = patch;

			_version = key.substring("dxp-".length());
		}

		private String _getDisplayVersion() {
			return StringUtil.toUpperCase(_getTag());
		}

		private String _getReleaseDate() {
			if (_downloadJSONObject == null) {
				return "";
			}

			return _downloadJSONObject.optString("releaseDate");
		}

		private String _getTag() {
			return _line + "." + _patch;
		}

		private static final Pattern _pattern = Pattern.compile(
			"dxp-(\\d{4})\\.q(\\d)\\.(\\d+)(-lts)?");

		private JSONObject _downloadJSONObject;
		private boolean _first;
		private final String _key;
		private final String _line;
		private final int _patch;
		private final String _version;

	}

	private static class ReleaseFile {

		private ReleaseFile(
			String groupName, String name, String regex, int priority) {

			_groupName = groupName;
			_name = name;
			_priority = priority;

			_pattern = Pattern.compile(regex);
		}

		private final String _groupName;
		private final String _name;
		private final Pattern _pattern;
		private final int _priority;

	}

}