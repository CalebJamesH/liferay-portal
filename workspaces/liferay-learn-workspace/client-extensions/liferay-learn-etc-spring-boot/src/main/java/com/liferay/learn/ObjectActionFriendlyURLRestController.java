/**
 * SPDX-FileCopyrightText: (c) 2026 Liferay, Inc. https://liferay.com
 * SPDX-License-Identifier: LGPL-2.1-or-later OR LicenseRef-Liferay-DXP-EULA-2.0.0-2023-06
 */

package com.liferay.learn;

import com.liferay.client.extension.util.spring.boot3.BaseRestController;
import com.liferay.client.extension.util.spring.boot3.client.LiferayOAuth2AccessTokenManager;
import com.liferay.petra.string.StringBundler;
import com.liferay.portal.kernel.util.StringUtil;
import com.liferay.portal.kernel.util.TreeMapBuilder;

import java.text.Normalizer;

import java.util.Map;
import java.util.Objects;

import org.apache.commons.logging.Log;
import org.apache.commons.logging.LogFactory;

import org.json.JSONArray;
import org.json.JSONObject;

import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;
import org.springframework.web.util.UriComponentsBuilder;

/**
 * @author Caleb Hall
 * @author Francesco Acciaro
 */
@RequestMapping("/object/action/friendly-url")
@RestController
public class ObjectActionFriendlyURLRestController extends BaseRestController {

	@PostMapping
	public ResponseEntity<String> post(@RequestBody String json) {
		JSONObject jsonObject = new JSONObject(json);

		String objectName = _getObjectName(jsonObject);

		if (objectName == null) {
			return new ResponseEntity<>(
				"Unsupported Object", HttpStatus.BAD_REQUEST);
		}

		try {
			JSONObject objectEntryJSONObject = jsonObject.getJSONObject(
				"objectEntry");

			JSONObject valuesJSONObject = objectEntryJSONObject.getJSONObject(
				"values");

			ObjectInfo objectInfo = _objectInfoMap.get(objectName);

			String friendlyURLPath = _buildFriendlyURLPath(
				objectInfo, valuesJSONObject);

			if (friendlyURLPath.isEmpty() ||
				Objects.equals(
					friendlyURLPath,
					jsonObject.getJSONObject(
						_DTO_KEY_PREFIX + objectName
					).optString(
						"friendlyUrlPath"
					))) {

				return new ResponseEntity<>(json, HttpStatus.OK);
			}

			long objectEntryId = objectEntryJSONObject.getLong("id");

			_patchFriendlyURL(
				friendlyURLPath, objectEntryId, objectInfo.getRESTPath());

			_propagateFriendlyURL(friendlyURLPath, objectEntryId, objectName);
		}
		catch (Exception exception) {
			_log.error("Unable to update friendly URL", exception);
		}

		return new ResponseEntity<>(json, HttpStatus.OK);
	}

	private String _buildFriendlyURLPath(
		ObjectInfo objectInfo, JSONObject valuesJSONObject) {

		String slug = _normalizeSlug(valuesJSONObject.getString("title"));

		if (slug.isEmpty() || !objectInfo.hasParent()) {
			return slug;
		}

		ObjectInfo parentObjectInfo = _objectInfoMap.get(
			objectInfo.getParentObjectName());

		long parentId = valuesJSONObject.getLong(
			objectInfo.getParentRelationshipFieldName());

		JSONObject parentJSONObject = new JSONObject(
			get(
				_getAuthorization(),
				UriComponentsBuilder.fromPath(
					parentObjectInfo.getRESTPath()
				).pathSegment(
					String.valueOf(parentId)
				).build(
				).toUri()));

		String parentFriendlyURLPath = _buildFriendlyURLPath(
			parentObjectInfo, parentJSONObject);

		if (parentFriendlyURLPath.isEmpty()) {
			return parentFriendlyURLPath;
		}

		return parentFriendlyURLPath + "/" + slug;
	}

	private String _getAuthorization() {
		return _liferayOAuth2AccessTokenManager.getAuthorization(
			"liferay-learn-etc-spring-boot-oahs");
	}

	private String _getObjectName(JSONObject jsonObject) {
		for (String objectName : _objectInfoMap.keySet()) {
			if (jsonObject.has(_DTO_KEY_PREFIX + objectName)) {
				return objectName;
			}
		}

		return null;
	}

	private String _normalizeSlug(String title) {
		String slug = Normalizer.normalize(title, Normalizer.Form.NFD);

		slug = slug.replaceAll("\\p{M}", "");
		slug = StringUtil.toLowerCase(slug);
		slug = slug.replaceAll("[^a-z0-9_]+", "-");

		return slug.replaceAll("^-|-$", "");
	}

	private void _patchFriendlyURL(
		String friendlyURLPath, long objectEntryId, String restPath) {

		patch(
			_getAuthorization(),
			new JSONObject(
			).put(
				"friendlyUrlPath", friendlyURLPath
			).put(
				"friendlyUrlPath_i18n",
				new JSONObject(
				).put(
					"en_US", friendlyURLPath
				)
			).toString(),
			UriComponentsBuilder.fromPath(
				restPath
			).pathSegment(
				String.valueOf(objectEntryId)
			).build(
			).toUri());
	}

	private void _propagateFriendlyURL(
		String friendlyURLPath, long objectEntryId, String objectName) {

		for (Map.Entry<String, ObjectInfo> entry : _objectInfoMap.entrySet()) {
			ObjectInfo childObjectInfo = entry.getValue();

			if (!Objects.equals(
					objectName, childObjectInfo.getParentObjectName())) {

				continue;
			}

			JSONArray childJSONArray = new JSONObject(
				get(
					_getAuthorization(),
					UriComponentsBuilder.fromPath(
						childObjectInfo.getRESTPath()
					).queryParam(
						"filter",
						StringBundler.concat(
							childObjectInfo.getParentRelationshipFieldName(),
							" eq '", objectEntryId, "'")
					).queryParam(
						"pageSize", -1
					).build(
					).toUri())
			).getJSONArray(
				"items"
			);

			for (int i = 0; i < childJSONArray.length(); i++) {
				JSONObject childJSONObject = childJSONArray.getJSONObject(i);

				String childSlug = _normalizeSlug(
					childJSONObject.getString("title"));

				if (childSlug.isEmpty()) {
					continue;
				}

				String childFriendlyURLPath = friendlyURLPath + "/" + childSlug;
				long childObjectEntryId = childJSONObject.getLong("id");

				_patchFriendlyURL(
					childFriendlyURLPath, childObjectEntryId,
					childObjectInfo.getRESTPath());

				_propagateFriendlyURL(
					childFriendlyURLPath, childObjectEntryId, entry.getKey());
			}
		}
	}

	private static final String _DTO_KEY_PREFIX = "objectEntryDTO";

	private static final Log _log = LogFactory.getLog(
		ObjectActionFriendlyURLRestController.class);

	private static final Map<String, ObjectInfo> _objectInfoMap =
		TreeMapBuilder.put(
			"P2S3Course", new ObjectInfo("/o/c/p2s3courses")
		).put(
			"P2S3Lesson",
			new ObjectInfo(
				"P2S3Module", "r_p2s3ModuleToP2S3Lessons_c_p2s3ModuleId",
				"/o/c/p2s3lessons")
		).put(
			"P2S3Module",
			new ObjectInfo(
				"P2S3Course", "r_p2s3CourseToP2S3Modules_c_p2s3CourseId",
				"/o/c/p2s3modules")
		).put(
			"P2S3Quiz",
			new ObjectInfo(
				"P2S3Module", "r_p2s3ModuleToP2S3Quizzes_c_p2s3ModuleId",
				"/o/c/p2s3quizes")
		).build();

	@Autowired
	private LiferayOAuth2AccessTokenManager _liferayOAuth2AccessTokenManager;

	private static class ObjectInfo {

		public ObjectInfo(String restPath) {
			this(null, null, restPath);
		}

		public ObjectInfo(
			String parentObjectName, String parentRelationshipFieldName,
			String restPath) {

			_parentObjectName = parentObjectName;
			_parentRelationshipFieldName = parentRelationshipFieldName;
			_restPath = restPath;
		}

		public String getParentObjectName() {
			return _parentObjectName;
		}

		public String getParentRelationshipFieldName() {
			return _parentRelationshipFieldName;
		}

		public String getRESTPath() {
			return _restPath;
		}

		public boolean hasParent() {
			if (_parentObjectName == null) {
				return false;
			}

			return true;
		}

		private final String _parentObjectName;
		private final String _parentRelationshipFieldName;
		private final String _restPath;

	}

}