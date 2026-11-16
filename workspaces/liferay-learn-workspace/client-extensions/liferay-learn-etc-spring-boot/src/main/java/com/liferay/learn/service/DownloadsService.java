/**
 * SPDX-FileCopyrightText: (c) 2026 Liferay, Inc. https://liferay.com
 * SPDX-License-Identifier: LGPL-2.1-or-later OR LicenseRef-Liferay-DXP-EULA-2.0.0-2023-06
 */

package com.liferay.learn.service;

import com.liferay.client.extension.util.spring.boot3.client.LiferayOAuth2AccessTokenManager;
import com.liferay.client.extension.util.spring.boot3.service.BaseService;
import com.liferay.petra.string.StringBundler;
import com.liferay.portal.kernel.util.StringUtil;
import com.liferay.portal.kernel.util.Validator;

import java.io.InputStream;

import java.net.URLEncoder;

import java.nio.charset.StandardCharsets;

import java.time.Duration;
import java.time.Instant;

import java.util.ArrayList;
import java.util.Collections;
import java.util.Comparator;
import java.util.HashMap;
import java.util.LinkedHashMap;
import java.util.List;
import java.util.Map;
import java.util.concurrent.CompletableFuture;
import java.util.concurrent.TimeUnit;

import org.apache.commons.logging.Log;
import org.apache.commons.logging.LogFactory;

import org.json.JSONArray;
import org.json.JSONObject;

import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.scheduling.annotation.Scheduled;
import org.springframework.stereotype.Component;
import org.springframework.web.util.UriComponentsBuilder;

/**
 * @author Caleb Hall
 */
@Component
public class DownloadsService extends BaseService {

	public void clearCache() {
		_stale = true;

		CompletableFuture.runAsync(this::refreshDownloadJSONObjects);
	}

	public String getDownloadFileURL(String url) {
		if (!url.startsWith("/")) {
			return url;
		}

		int index = url.lastIndexOf('/');

		String fileName = StringUtil.replace(
			url.substring(index + 1), '+', ' ');

		String encodedFileName = StringUtil.replace(
			URLEncoder.encode(fileName, StandardCharsets.UTF_8), '+', "%20");

		return StringBundler.concat(
			_fileURL, url.substring(0, index + 1), encodedFileName);
	}

	public JSONObject getDownloadJSONObject(String urlTitle) throws Exception {
		for (JSONObject downloadJSONObject : getDownloadJSONObjects()) {
			if (urlTitle.equals(downloadJSONObject.optString("urlTitle"))) {
				return downloadJSONObject;
			}
		}

		return null;
	}

	public List<JSONObject> getDownloadJSONObjects() throws Exception {
		List<JSONObject> downloadJSONObjects = _downloadJSONObjects;

		if (downloadJSONObjects != null) {
			return downloadJSONObjects;
		}

		return _refreshDownloadJSONObjects();
	}

	public List<JSONObject> getFreshDownloadJSONObjects() throws Exception {
		_stale = true;

		return _refreshDownloadJSONObjects();
	}

	public JSONObject getDownloadsJSONObject(
			String productKey, String fileTypeKey, int page, int pageSize)
		throws Exception {

		List<JSONObject> downloadJSONObjects = new ArrayList<>();

		for (JSONObject downloadJSONObject : getDownloadJSONObjects()) {
			if (productKey.equals(downloadJSONObject.optString("product")) &&
				_hasFileType(downloadJSONObject, fileTypeKey)) {

				downloadJSONObjects.add(downloadJSONObject);
			}
		}

		page = Math.max(page, 1);
		pageSize = Math.min(Math.max(pageSize, 1), _MAX_PAGE_SIZE);

		int start = Math.min((page - 1) * pageSize, downloadJSONObjects.size());

		int end = Math.min(start + pageSize, downloadJSONObjects.size());

		return new JSONObject(
		).put(
			"items", new JSONArray(downloadJSONObjects.subList(start, end))
		).put(
			"page", page
		).put(
			"pageSize", pageSize
		).put(
			"totalCount", downloadJSONObjects.size()
		);
	}

	public JSONArray getProductsJSONArray() throws Exception {
		if (_productsJSONArray != null) {
			return _productsJSONArray;
		}

		try (InputStream inputStream =
				DownloadsService.class.getResourceAsStream(
					"/downloads/products.json")) {

			_productsJSONArray = new JSONArray(
				new String(inputStream.readAllBytes(), StandardCharsets.UTF_8));
		}

		return _productsJSONArray;
	}

	@Scheduled(fixedDelay = 1, timeUnit = TimeUnit.MINUTES)
	public void refreshDownloadJSONObjects() {
		try {
			_refreshDownloadJSONObjects();
		}
		catch (Exception exception) {
			if (_log.isWarnEnabled()) {
				_log.warn("Unable to refresh downloads", exception);
			}
		}
	}

	private JSONObject _getDownloadJSONObject(
		JSONObject objectEntryJSONObject,
		List<JSONObject> fileObjectEntryJSONObjects,
		List<JSONObject> linkObjectEntryJSONObjects) {

		Map<String, JSONArray> filesJSONArrays = new LinkedHashMap<>();

		fileObjectEntryJSONObjects.sort(_priorityComparator);

		for (JSONObject fileObjectEntryJSONObject :
				fileObjectEntryJSONObjects) {

			JSONArray filesJSONArray = filesJSONArrays.computeIfAbsent(
				fileObjectEntryJSONObject.optString("groupName"),
				groupName -> new JSONArray());

			filesJSONArray.put(
				new JSONObject(
				).put(
					"id", fileObjectEntryJSONObject.getLong("id")
				).put(
					"md5", fileObjectEntryJSONObject.optString("md5")
				).put(
					"name", fileObjectEntryJSONObject.optString("name")
				).put(
					"otherDetails",
					fileObjectEntryJSONObject.optString("otherDetails")
				).put(
					"sha1", fileObjectEntryJSONObject.optString("sha1")
				).put(
					"sha512", fileObjectEntryJSONObject.optString("sha512")
				).put(
					"size", fileObjectEntryJSONObject.optString("size")
				).put(
					"url",
					getDownloadFileURL(
						fileObjectEntryJSONObject.optString("url"))
				));
		}

		JSONArray fileGroupsJSONArray = new JSONArray();

		for (Map.Entry<String, JSONArray> entry : filesJSONArrays.entrySet()) {
			fileGroupsJSONArray.put(
				new JSONObject(
				).put(
					"files", entry.getValue()
				).put(
					"name", entry.getKey()
				));
		}

		JSONArray linksJSONArray = new JSONArray();

		linkObjectEntryJSONObjects.sort(_priorityComparator);

		for (JSONObject linkObjectEntryJSONObject :
				linkObjectEntryJSONObjects) {

			linksJSONArray.put(
				new JSONObject(
				).put(
					"label", linkObjectEntryJSONObject.optString("label")
				).put(
					"url", linkObjectEntryJSONObject.optString("url")
				));
		}

		JSONArray fileTypesJSONArray = new JSONArray();

		JSONArray objectEntryFileTypesJSONArray =
			objectEntryJSONObject.optJSONArray("fileTypes");

		if (objectEntryFileTypesJSONArray != null) {
			for (int i = 0; i < objectEntryFileTypesJSONArray.length(); i++) {
				fileTypesJSONArray.put(
					_getKey(objectEntryFileTypesJSONArray.opt(i)));
			}
		}

		return new JSONObject(
		).put(
			"additionalNotes",
			objectEntryJSONObject.optString("additionalNotes")
		).put(
			"alertMessage", objectEntryJSONObject.optString("alertMessage")
		).put(
			"downloadNumber", objectEntryJSONObject.optLong("downloadNumber")
		).put(
			"fileGroups", fileGroupsJSONArray
		).put(
			"fileTypes", fileTypesJSONArray
		).put(
			"id", objectEntryJSONObject.getLong("id")
		).put(
			"links", linksJSONArray
		).put(
			"product", _getKey(objectEntryJSONObject.opt("product"))
		).put(
			"releaseDate", objectEntryJSONObject.optString("releaseDate")
		).put(
			"releaseKey", objectEntryJSONObject.optString("releaseKey")
		).put(
			"requiredAgreement",
			_getKey(objectEntryJSONObject.opt("requiredAgreement"))
		).put(
			"title", objectEntryJSONObject.optString("title")
		).put(
			"urlTitle", objectEntryJSONObject.optString("urlTitle")
		);
	}

	private String _getKey(Object object) {
		if (object instanceof JSONObject) {
			JSONObject jsonObject = (JSONObject)object;

			return jsonObject.optString("key");
		}

		if (object instanceof String) {
			return (String)object;
		}

		return "";
	}

	private List<JSONObject> _getObjectEntriesDownloadJSONObjects()
		throws Exception {

		String authorization =
			_liferayOAuth2AccessTokenManager.getAuthorization(
				"liferay-learn-etc-spring-boot-oahs");

		Map<Long, List<JSONObject>> fileObjectEntryJSONObjects =
			_getObjectEntryJSONObjectsMap(
				authorization, "/o/c/p2s3downloadfiles",
				"r_p2s3DownloadToP2S3DownloadFiles_c_p2s3DownloadId");
		Map<Long, List<JSONObject>> linkObjectEntryJSONObjects =
			_getObjectEntryJSONObjectsMap(
				authorization, "/o/c/p2s3downloadlinks",
				"r_p2s3DownloadToP2S3DownloadLinks_c_p2s3DownloadId");

		List<JSONObject> downloadJSONObjects = new ArrayList<>();

		for (JSONObject objectEntryJSONObject :
				_getObjectEntryJSONObjects(
					authorization, "/o/c/p2s3downloads")) {

			long id = objectEntryJSONObject.getLong("id");

			downloadJSONObjects.add(
				_getDownloadJSONObject(
					objectEntryJSONObject,
					fileObjectEntryJSONObjects.getOrDefault(
						id, new ArrayList<>()),
					linkObjectEntryJSONObjects.getOrDefault(
						id, new ArrayList<>())));
		}

		downloadJSONObjects.sort(_downloadComparator);

		return Collections.unmodifiableList(downloadJSONObjects);
	}

	private List<JSONObject> _getObjectEntryJSONObjects(
			String authorization, String path)
		throws Exception {

		List<JSONObject> objectEntryJSONObjects = new ArrayList<>();

		for (int page = 1;; page++) {
			String json = get(
				authorization,
				UriComponentsBuilder.fromPath(
					path
				).queryParam(
					"page", page
				).queryParam(
					"pageSize", _OBJECT_ENTRIES_PAGE_SIZE
				).build(
				).toUri());

			if (json == null) {
				throw new Exception("Unable to get " + path);
			}

			JSONObject jsonObject = new JSONObject(json);

			JSONArray itemsJSONArray = jsonObject.getJSONArray("items");

			for (int i = 0; i < itemsJSONArray.length(); i++) {
				objectEntryJSONObjects.add(itemsJSONArray.getJSONObject(i));
			}

			if (jsonObject.optInt("lastPage", page) <= page) {
				return objectEntryJSONObjects;
			}
		}
	}

	private Map<Long, List<JSONObject>> _getObjectEntryJSONObjectsMap(
			String authorization, String path, String relationshipFieldName)
		throws Exception {

		Map<Long, List<JSONObject>> objectEntryJSONObjectsMap = new HashMap<>();

		for (JSONObject objectEntryJSONObject :
				_getObjectEntryJSONObjects(authorization, path)) {

			long downloadId = objectEntryJSONObject.optLong(
				relationshipFieldName);

			if (downloadId == 0) {
				continue;
			}

			List<JSONObject> objectEntryJSONObjects =
				objectEntryJSONObjectsMap.computeIfAbsent(
					downloadId, key -> new ArrayList<>());

			objectEntryJSONObjects.add(objectEntryJSONObject);
		}

		return objectEntryJSONObjectsMap;
	}

	private synchronized List<JSONObject> _refreshDownloadJSONObjects()
		throws Exception {

		Instant instant = Instant.now();

		if ((_downloadJSONObjects != null) && !_stale &&
			instant.isBefore(_downloadsExpirationInstant)) {

			return _downloadJSONObjects;
		}

		_stale = false;

		try {
			_downloadJSONObjects = _getObjectEntriesDownloadJSONObjects();
			_downloadsExpirationInstant = Instant.now(
			).plus(
				_CACHE_DURATION
			);
		}
		catch (Exception exception) {
			if (_downloadJSONObjects == null) {
				throw exception;
			}

			if (_log.isWarnEnabled()) {
				_log.warn("Unable to refresh downloads", exception);
			}

			_downloadsExpirationInstant = Instant.now(
			).plus(
				_RETRY_DURATION
			);
		}

		return _downloadJSONObjects;
	}

	private boolean _hasFileType(
		JSONObject downloadJSONObject, String fileTypeKey) {

		if (Validator.isNull(fileTypeKey)) {
			return false;
		}

		JSONArray fileTypesJSONArray = downloadJSONObject.getJSONArray(
			"fileTypes");

		for (int i = 0; i < fileTypesJSONArray.length(); i++) {
			if (fileTypeKey.equals(fileTypesJSONArray.optString(i))) {
				return true;
			}
		}

		return false;
	}

	private static final Duration _CACHE_DURATION = Duration.ofMinutes(15);

	private static final int _MAX_PAGE_SIZE = 200;

	private static final int _OBJECT_ENTRIES_PAGE_SIZE = 500;

	private static final Duration _RETRY_DURATION = Duration.ofMinutes(1);

	private static final Log _log = LogFactory.getLog(DownloadsService.class);

	private static final Comparator<JSONObject> _downloadComparator =
		Comparator.comparingLong(
			(JSONObject jsonObject) -> jsonObject.optLong("downloadNumber")
		).thenComparing(
			jsonObject -> jsonObject.optString("releaseDate")
		).thenComparingLong(
			jsonObject -> jsonObject.optLong("id")
		).reversed();
	private static final Comparator<JSONObject> _priorityComparator =
		Comparator.comparingInt(
			(JSONObject jsonObject) -> jsonObject.optInt("priority")
		).thenComparingLong(
			jsonObject -> jsonObject.optLong("id")
		);

	private volatile List<JSONObject> _downloadJSONObjects;
	private volatile Instant _downloadsExpirationInstant;

	@Value("${liferay.learn.downloads.file.url}")
	private String _fileURL;

	@Autowired
	private LiferayOAuth2AccessTokenManager _liferayOAuth2AccessTokenManager;

	private volatile JSONArray _productsJSONArray;
	private volatile boolean _stale;

}