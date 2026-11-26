/**
 * SPDX-FileCopyrightText: (c) 2026 Liferay, Inc. https://liferay.com
 * SPDX-License-Identifier: LGPL-2.1-or-later OR LicenseRef-Liferay-DXP-EULA-2.0.0-2023-06
 */

package com.liferay.learn.service;

import com.liferay.petra.string.StringBundler;
import com.liferay.petra.string.StringPool;
import com.liferay.portal.kernel.util.StringUtil;
import com.liferay.portal.kernel.util.Validator;

import java.time.Duration;
import java.time.Instant;

import java.util.ArrayList;
import java.util.Collection;
import java.util.Collections;
import java.util.HashMap;
import java.util.HashSet;
import java.util.LinkedHashMap;
import java.util.List;
import java.util.Map;
import java.util.Objects;
import java.util.Set;
import java.util.regex.Matcher;
import java.util.regex.Pattern;

import org.apache.commons.logging.Log;
import org.apache.commons.logging.LogFactory;

import org.json.JSONArray;
import org.json.JSONObject;

import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.stereotype.Component;

/**
 * @author Caleb Hall
 */
@Component
public class ReleaseChangelogService {

	public JSONObject getChangelogJSONObject(
			Collection<String> components, String fromReleaseKey,
			String keywords, int page, int pageSize, String toReleaseKey)
		throws Exception {

		List<String> releaseKeys = _releaseNotesService.getReleaseKeys(
			fromReleaseKey, toReleaseKey);

		if (releaseKeys == null) {
			return null;
		}

		JSONObject productVersionJSONObject =
			_releaseNotesService.getProductVersionJSONObject(fromReleaseKey);

		String fieldName = _releaseFieldNames.get(
			productVersionJSONObject.getString("line"));

		Map<String, String> jiraReleaseNames = new LinkedHashMap<>();
		Map<String, String> releaseNames = _getReleaseNames();

		for (String releaseKey : releaseKeys) {
			jiraReleaseNames.put(
				_getReleaseFieldValue(fieldName, releaseKey),
				releaseNames.get(releaseKey));
		}

		String jql = _getJQL(
			_filterComponentNames(components), fieldName, fromReleaseKey,
			keywords, productVersionJSONObject, jiraReleaseNames.keySet());

		long[] issueIds = _jiraService.getIssueIds(
			jql + _getOrderBy(fieldName));

		JSONArray itemsJSONArray = new JSONArray();

		int start = (page - 1) * pageSize;

		int end = Math.min(start + pageSize, issueIds.length);

		if (start < end) {
			List<String> pageIssueIds = new ArrayList<>();

			for (int i = start; i < end; i++) {
				pageIssueIds.add(String.valueOf(issueIds[i]));
			}

			JSONObject searchJSONObject = _jiraService.searchJSONObject(
				"renderedFields",
				"id in (" + String.join(", ", pageIssueIds) + ")",
				pageIssueIds.size(), null, _FIELD_NAME_COMPONENTS,
				_FIELD_NAME_DESCRIPTION, _FIELD_NAME_SUMMARY, fieldName);

			Map<String, JSONObject> issueJSONObjects = new HashMap<>();

			JSONArray issuesJSONArray = searchJSONObject.getJSONArray("issues");

			for (int i = 0; i < issuesJSONArray.length(); i++) {
				JSONObject issueJSONObject = issuesJSONArray.getJSONObject(i);

				issueJSONObjects.put(
					issueJSONObject.getString("id"), issueJSONObject);
			}

			for (String pageIssueId : pageIssueIds) {
				JSONObject issueJSONObject = issueJSONObjects.get(pageIssueId);

				if (issueJSONObject != null) {
					itemsJSONArray.put(
						_getItemJSONObject(
							fieldName, issueJSONObject, jiraReleaseNames));
				}
			}
		}

		return new JSONObject(
		).put(
			"items", itemsJSONArray
		).put(
			"total", issueIds.length
		);
	}

	public synchronized List<String> getComponentNames() throws Exception {
		Instant instant = Instant.now();

		if ((_componentNames != null) &&
			instant.isBefore(_componentNamesExpirationInstant)) {

			return _componentNames;
		}

		try {
			_componentNames = _getComponentNames();
			_componentNamesExpirationInstant = instant.plus(Duration.ofDays(1));
		}
		catch (Exception exception) {
			if (_componentNames == null) {
				throw exception;
			}

			if (_log.isWarnEnabled()) {
				_log.warn("Unable to refresh Jira components", exception);
			}

			_componentNamesExpirationInstant = instant.plus(
				Duration.ofMinutes(5));
		}

		return _componentNames;
	}

	private List<String> _filterComponentNames(Collection<String> components)
		throws Exception {

		List<String> filteredComponentNames = new ArrayList<>();

		if (components.isEmpty()) {
			return filteredComponentNames;
		}

		List<String> componentNames = getComponentNames();

		for (String component : components) {
			if (componentNames.contains(component)) {
				filteredComponentNames.add(component);
			}
		}

		return filteredComponentNames;
	}

	private List<String> _getExcludedReleaseFieldValues(
		String fromReleaseKey, JSONObject productVersionJSONObject) {

		if (!_releaseNotesService.isQuarterlyRelease(fromReleaseKey)) {
			return Collections.emptyList();
		}

		List<String> excludedReleaseFieldValues = new ArrayList<>();

		JSONArray releasesJSONArray = productVersionJSONObject.getJSONArray(
			"releases");

		for (int i = 0; i < releasesJSONArray.length(); i++) {
			JSONObject releaseJSONObject = releasesJSONArray.getJSONObject(i);

			String releaseKey = releaseJSONObject.getString("key");

			if (Objects.equals(fromReleaseKey, releaseKey)) {
				break;
			}

			excludedReleaseFieldValues.add(
				_getReleaseFieldValue(_FIELD_NAME_RELEASE_TAGS, releaseKey));
		}

		return excludedReleaseFieldValues;
	}

	private JSONObject _getItemJSONObject(
		String fieldName, JSONObject issueJSONObject,
		Map<String, String> jiraReleaseNames) {

		JSONArray componentNamesJSONArray = new JSONArray();

		JSONObject fieldsJSONObject = issueJSONObject.getJSONObject("fields");

		JSONArray componentsJSONArray = fieldsJSONObject.optJSONArray(
			_FIELD_NAME_COMPONENTS);

		if (componentsJSONArray != null) {
			for (int i = 0; i < componentsJSONArray.length(); i++) {
				JSONObject componentJSONObject =
					componentsJSONArray.getJSONObject(i);

				componentNamesJSONArray.put(
					componentJSONObject.getString("name"));
			}
		}

		String description = StringPool.BLANK;

		JSONObject renderedFieldsJSONObject = issueJSONObject.optJSONObject(
			"renderedFields");

		if (renderedFieldsJSONObject != null) {
			Matcher matcher = _relativeURLPattern.matcher(
				renderedFieldsJSONObject.optString(_FIELD_NAME_DESCRIPTION));

			description = matcher.replaceAll(
				"$1=\"" + Matcher.quoteReplacement(_jiraURL) + "/");
		}

		String key = issueJSONObject.getString("key");

		return new JSONObject(
		).put(
			"components", componentNamesJSONArray
		).put(
			"description", description
		).put(
			"key", key
		).put(
			"releases",
			_getReleasesJSONArray(fieldName, fieldsJSONObject, jiraReleaseNames)
		).put(
			"summary", fieldsJSONObject.optString(_FIELD_NAME_SUMMARY)
		).put(
			"url", StringBundler.concat(_jiraURL, "/browse/", key)
		);
	}

	private List<String> _getComponentNames() throws Exception {
		JSONArray componentsJSONArray = _jiraService.getComponentsJSONArray(
			"LPD");

		List<String> componentNames = new ArrayList<>();

		for (int i = 0; i < componentsJSONArray.length(); i++) {
			JSONObject componentJSONObject = componentsJSONArray.getJSONObject(
				i);

			componentNames.add(componentJSONObject.getString("name"));
		}

		componentNames.sort(String.CASE_INSENSITIVE_ORDER);

		return Collections.unmodifiableList(componentNames);
	}

	private String _getReleaseFieldValue(String fieldName, String releaseKey) {
		if (!Objects.equals(fieldName, _FIELD_NAME_RELEASE_TAGS)) {
			Matcher matcher = _fixPackNumberPattern.matcher(releaseKey);

			if (matcher.find()) {
				return matcher.group(1);
			}

			return "0";
		}

		if (Objects.equals(releaseKey, "7413-base")) {
			return "7.4.13 DXP GA1";
		}

		Matcher matcher = _updateReleaseKeyPattern.matcher(releaseKey);

		if (matcher.matches()) {
			return "7.4.13 DXP U" + matcher.group(1);
		}

		return StringUtil.toUpperCase(releaseKey.substring("7413-".length()));
	}

	private String _getJQL(
		List<String> componentNames, String fieldName, String fromReleaseKey,
		String keywords, JSONObject productVersionJSONObject,
		Collection<String> releaseFieldValues) {

		StringBundler sb = new StringBundler(18);

		sb.append("project in (LPD, LPE, LPS) AND level is empty AND ");

		String jqlField = _toJQLField(fieldName);

		if (Objects.equals(fieldName, _FIELD_NAME_RELEASE_TAGS)) {
			sb.append(jqlField);
			sb.append(" in (");
			sb.append(_toJQLValue(releaseFieldValues));
			sb.append(StringPool.CLOSE_PARENTHESIS);

			List<String> excludedReleaseFieldValues =
				_getExcludedReleaseFieldValues(
					fromReleaseKey, productVersionJSONObject);

			if (!excludedReleaseFieldValues.isEmpty()) {
				sb.append(" AND ");
				sb.append(jqlField);
				sb.append(" not in (");
				sb.append(_toJQLValue(excludedReleaseFieldValues));
				sb.append(StringPool.CLOSE_PARENTHESIS);
			}
		}
		else {
			List<String> releaseFieldValuesList = new ArrayList<>(
				releaseFieldValues);

			sb.append(jqlField);
			sb.append(" >= ");
			sb.append(releaseFieldValuesList.get(0));
			sb.append(" AND ");
			sb.append(jqlField);
			sb.append(" <= ");
			sb.append(
				releaseFieldValuesList.get(releaseFieldValuesList.size() - 1));
		}

		if (!componentNames.isEmpty()) {
			sb.append(" AND component in (");
			sb.append(_toJQLValue(componentNames));
			sb.append(StringPool.CLOSE_PARENTHESIS);
		}

		if (Validator.isNotNull(keywords)) {
			Matcher matcher = _textSearchOperatorPattern.matcher(
				keywords.trim());

			String jqlValue = _toJQLValue(matcher.replaceAll("\\\\$0"));

			sb.append(" AND (summary ~ ");
			sb.append(jqlValue);
			sb.append(" OR description ~ ");
			sb.append(jqlValue);
			sb.append(StringPool.CLOSE_PARENTHESIS);
		}

		return sb.toString();
	}

	private String _getOrderBy(String fieldName) {
		if (Objects.equals(fieldName, _FIELD_NAME_RELEASE_TAGS)) {
			return " ORDER BY resolutiondate DESC, key DESC";
		}

		return StringBundler.concat(
			" ORDER BY ", _toJQLField(fieldName), " DESC, key DESC");
	}

	private Map<String, String> _getReleaseNames() throws Exception {
		Map<String, String> releaseNames = new HashMap<>();

		JSONArray productVersionsJSONArray =
			_releaseNotesService.getProductVersionsJSONArray();

		for (int i = 0; i < productVersionsJSONArray.length(); i++) {
			JSONObject productVersionJSONObject =
				productVersionsJSONArray.getJSONObject(i);

			JSONArray releasesJSONArray = productVersionJSONObject.getJSONArray(
				"releases");

			for (int j = 0; j < releasesJSONArray.length(); j++) {
				JSONObject releaseJSONObject = releasesJSONArray.getJSONObject(
					j);

				releaseNames.put(
					releaseJSONObject.getString("key"),
					releaseJSONObject.getString("name"));
			}
		}

		return releaseNames;
	}

	private JSONArray _getReleasesJSONArray(
		String fieldName, JSONObject fieldsJSONObject,
		Map<String, String> jiraReleaseNames) {

		Set<String> releaseFieldValues = new HashSet<>();

		if (Objects.equals(fieldName, _FIELD_NAME_RELEASE_TAGS)) {
			JSONArray releaseTagsJSONArray = fieldsJSONObject.optJSONArray(
				fieldName);

			if (releaseTagsJSONArray != null) {
				for (int i = 0; i < releaseTagsJSONArray.length(); i++) {
					JSONObject releaseTagJSONObject =
						releaseTagsJSONArray.getJSONObject(i);

					releaseFieldValues.add(
						releaseTagJSONObject.optString("name"));
				}
			}
		}
		else {
			Number number = fieldsJSONObject.optNumber(fieldName);

			if (number != null) {
				releaseFieldValues.add(String.valueOf(number.intValue()));
			}
		}

		JSONArray releasesJSONArray = new JSONArray();

		for (Map.Entry<String, String> entry : jiraReleaseNames.entrySet()) {
			if (releaseFieldValues.contains(entry.getKey())) {
				releasesJSONArray.put(entry.getValue());
			}
		}

		return releasesJSONArray;
	}

	private String _toJQLField(String fieldName) {
		return "cf[" + fieldName.substring(fieldName.indexOf('_') + 1) + "]";
	}

	private String _toJQLValue(String value) {
		value = StringUtil.replace(value, "\\", "\\\\");

		return StringPool.QUOTE + StringUtil.replace(value, "\"", "\\\"") +
			StringPool.QUOTE;
	}

	private String _toJQLValue(Collection<String> values) {
		List<String> jqlValues = new ArrayList<>();

		for (String value : values) {
			jqlValues.add(_toJQLValue(value));
		}

		return String.join(", ", jqlValues);
	}

	private static final String _FIELD_NAME_COMPONENTS = "components";

	private static final String _FIELD_NAME_DESCRIPTION = "description";

	private static final String _FIELD_NAME_RELEASE_TAGS = "customfield_10886";

	private static final String _FIELD_NAME_SUMMARY = "summary";

	private static final Log _log = LogFactory.getLog(
		ReleaseChangelogService.class);

	private static final Pattern _fixPackNumberPattern = Pattern.compile(
		"-\\D*(\\d+)$");
	private static final Map<String, String> _releaseFieldNames = Map.of(
		"7.0", "customfield_10206", "7.1", "customfield_10207", "7.2",
		"customfield_10208", "7.3", "customfield_10209", "7.4",
		_FIELD_NAME_RELEASE_TAGS);
	private static final Pattern _relativeURLPattern = Pattern.compile(
		"(href|src)=\"/(?!/)");
	private static final Pattern _textSearchOperatorPattern = Pattern.compile(
		"[!\"&()*+\\-:?\\[\\\\\\]^{|}~]");
	private static final Pattern _updateReleaseKeyPattern = Pattern.compile(
		"7413-u(\\d+)");

	private List<String> _componentNames;
	private Instant _componentNamesExpirationInstant;

	@Autowired
	private JiraService _jiraService;

	@Value("${liferay.learn.jira.url}")
	private String _jiraURL;

	@Autowired
	private ReleaseNotesService _releaseNotesService;

}