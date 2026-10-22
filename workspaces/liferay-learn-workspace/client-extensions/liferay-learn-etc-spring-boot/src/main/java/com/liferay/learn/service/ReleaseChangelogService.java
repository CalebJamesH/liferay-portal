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
			String fromReleaseKey, String toReleaseKey,
			Collection<String> components, String keywords, int page,
			int pageSize)
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
				_getJiraValue(fieldName, releaseKey),
				releaseNames.get(releaseKey));
		}

		String jql = _getJQL(
			_filterComponentNames(components), fieldName, fromReleaseKey,
			jiraReleaseNames.keySet(), keywords, productVersionJSONObject);

		long[] issueIds = _getIssueIds(jql + _getOrderBy(fieldName));

		JSONArray itemsJSONArray = new JSONArray();

		int start = (page - 1) * pageSize;

		int end = Math.min(start + pageSize, issueIds.length);

		if (start < end) {
			List<String> pageIssueIds = new ArrayList<>();

			for (int i = start; i < end; i++) {
				pageIssueIds.add(String.valueOf(issueIds[i]));
			}

			JSONObject searchJSONObject = _jiraService.searchIssuesJSONObject(
				"id in (" + String.join(", ", pageIssueIds) + ")",
				"renderedFields", pageIssueIds.size(), null,
				_FIELD_NAME_COMPONENTS, _FIELD_NAME_DESCRIPTION,
				_FIELD_NAME_SUMMARY, fieldName);

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
			_componentNames = _getJiraComponentNames();
			_componentNamesExpirationInstant = instant.plus(_CACHE_DURATION);
		}
		catch (Exception exception) {
			if (_componentNames == null) {
				throw exception;
			}

			if (_log.isWarnEnabled()) {
				_log.warn("Unable to refresh Jira components", exception);
			}

			_componentNamesExpirationInstant = instant.plus(_RETRY_DURATION);
		}

		return _componentNames;
	}

	private List<String> _filterComponentNames(Collection<String> components)
		throws Exception {

		List<String> componentNames = new ArrayList<>();

		if (components.isEmpty()) {
			return componentNames;
		}

		List<String> jiraComponentNames = getComponentNames();

		for (String component : components) {
			if (jiraComponentNames.contains(component)) {
				componentNames.add(component);
			}
		}

		return componentNames;
	}

	private long[] _getIssueIds(String jql) throws Exception {
		Instant instant = Instant.now();

		synchronized (_issueIdsCacheEntries) {
			IssueIdsCacheEntry issueIdsCacheEntry = _issueIdsCacheEntries.get(
				jql);

			if ((issueIdsCacheEntry != null) &&
				instant.isBefore(issueIdsCacheEntry.getExpirationInstant())) {

				return issueIdsCacheEntry.getIssueIds();
			}
		}

		List<Long> issueIds = new ArrayList<>();

		String nextPageToken = null;

		do {
			JSONObject searchJSONObject = _jiraService.searchIssuesJSONObject(
				jql, null, _ISSUE_IDS_PAGE_SIZE, nextPageToken, "id");

			JSONArray issuesJSONArray = searchJSONObject.getJSONArray("issues");

			for (int i = 0; i < issuesJSONArray.length(); i++) {
				JSONObject issueJSONObject = issuesJSONArray.getJSONObject(i);

				issueIds.add(issueJSONObject.getLong("id"));
			}

			nextPageToken = searchJSONObject.optString("nextPageToken");
		}
		while (Validator.isNotNull(nextPageToken));

		long[] issueIdsArray = new long[issueIds.size()];

		for (int i = 0; i < issueIdsArray.length; i++) {
			issueIdsArray[i] = issueIds.get(i);
		}

		synchronized (_issueIdsCacheEntries) {
			_issueIdsCacheEntries.put(
				jql,
				new IssueIdsCacheEntry(
					instant.plus(_ISSUE_IDS_CACHE_DURATION), issueIdsArray));
		}

		return issueIdsArray;
	}

	private JSONObject _getItemJSONObject(
		String fieldName, JSONObject issueJSONObject,
		Map<String, String> jiraReleaseNames) {

		JSONObject fieldsJSONObject = issueJSONObject.getJSONObject("fields");

		JSONArray componentsJSONArray = new JSONArray();

		JSONArray jiraComponentsJSONArray = fieldsJSONObject.optJSONArray(
			_FIELD_NAME_COMPONENTS);

		if (jiraComponentsJSONArray != null) {
			for (int i = 0; i < jiraComponentsJSONArray.length(); i++) {
				JSONObject jiraComponentJSONObject =
					jiraComponentsJSONArray.getJSONObject(i);

				componentsJSONArray.put(
					jiraComponentJSONObject.getString("name"));
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
			"components", componentsJSONArray
		).put(
			"description", description
		).put(
			"key", key
		).put(
			"releases",
			_getReleasesJSONArray(
				fieldsJSONObject.opt(fieldName), jiraReleaseNames)
		).put(
			"summary", fieldsJSONObject.optString(_FIELD_NAME_SUMMARY)
		).put(
			"url", StringBundler.concat(_jiraURL, "/browse/", key)
		);
	}

	private List<String> _getJiraComponentNames() throws Exception {
		JSONArray componentsJSONArray = _jiraService.getComponentsJSONArray(
			_PROJECT_KEY_COMPONENTS);

		List<String> componentNames = new ArrayList<>();

		for (int i = 0; i < componentsJSONArray.length(); i++) {
			JSONObject componentJSONObject = componentsJSONArray.getJSONObject(
				i);

			componentNames.add(componentJSONObject.getString("name"));
		}

		componentNames.sort(String.CASE_INSENSITIVE_ORDER);

		return Collections.unmodifiableList(componentNames);
	}

	private String _getJiraValue(String fieldName, String releaseKey) {
		if (!fieldName.equals(_FIELD_NAME_RELEASE_TAGS)) {
			Matcher matcher = _fixPackNumberPattern.matcher(releaseKey);

			if (matcher.find()) {
				return matcher.group(1);
			}

			return "0";
		}

		if (releaseKey.equals(_RELEASE_KEY_7_4_GA)) {
			return "7.4.13 DXP GA1";
		}

		Matcher matcher = _updateReleaseKeyPattern.matcher(releaseKey);

		if (matcher.matches()) {
			return "7.4.13 DXP U" + matcher.group(1);
		}

		return StringUtil.toUpperCase(
			releaseKey.substring(_RELEASE_KEY_PREFIX_7_4.length()));
	}

	private String _getJQL(
		List<String> componentNames, String fieldName, String fromReleaseKey,
		Collection<String> jiraValues, String keywords,
		JSONObject productVersionJSONObject) {

		StringBundler sb = new StringBundler(20);

		sb.append("project in (");
		sb.append(_toJQLValues(_projectKeys));
		sb.append(") AND level is empty AND ");

		String jqlField = _toJQLField(fieldName);

		if (fieldName.equals(_FIELD_NAME_RELEASE_TAGS)) {
			sb.append(jqlField);
			sb.append(" in (");
			sb.append(_toJQLValues(jiraValues));
			sb.append(StringPool.CLOSE_PARENTHESIS);

			if (_releaseNotesService.isQuarterlyRelease(fromReleaseKey)) {
				List<String> excludedJiraValues = new ArrayList<>();

				JSONArray releasesJSONArray =
					productVersionJSONObject.getJSONArray("releases");

				for (int i = 0; i < releasesJSONArray.length(); i++) {
					JSONObject releaseJSONObject =
						releasesJSONArray.getJSONObject(i);

					String releaseKey = releaseJSONObject.getString("key");

					if (releaseKey.equals(fromReleaseKey)) {
						break;
					}

					excludedJiraValues.add(
						_getJiraValue(fieldName, releaseKey));
				}

				if (!excludedJiraValues.isEmpty()) {
					sb.append(" AND ");
					sb.append(jqlField);
					sb.append(" not in (");
					sb.append(_toJQLValues(excludedJiraValues));
					sb.append(StringPool.CLOSE_PARENTHESIS);
				}
			}
		}
		else {
			List<String> jiraValuesList = new ArrayList<>(jiraValues);

			sb.append(jqlField);
			sb.append(" >= ");
			sb.append(jiraValuesList.get(0));
			sb.append(" AND ");
			sb.append(jqlField);
			sb.append(" <= ");
			sb.append(jiraValuesList.get(jiraValuesList.size() - 1));
		}

		if (!componentNames.isEmpty()) {
			sb.append(" AND component in (");
			sb.append(_toJQLValues(componentNames));
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
		if (fieldName.equals(_FIELD_NAME_RELEASE_TAGS)) {
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
		Object value, Map<String, String> jiraReleaseNames) {

		Set<String> jiraValues = new HashSet<>();

		if (value instanceof JSONArray) {
			JSONArray jsonArray = (JSONArray)value;

			for (int i = 0; i < jsonArray.length(); i++) {
				JSONObject jsonObject = jsonArray.getJSONObject(i);

				jiraValues.add(jsonObject.optString("name"));
			}
		}
		else if (value instanceof Number) {
			Number number = (Number)value;

			jiraValues.add(String.valueOf(number.intValue()));
		}

		JSONArray releasesJSONArray = new JSONArray();

		for (Map.Entry<String, String> entry : jiraReleaseNames.entrySet()) {
			if (jiraValues.contains(entry.getKey())) {
				releasesJSONArray.put(entry.getValue());
			}
		}

		return releasesJSONArray;
	}

	private String _toJQLField(String fieldName) {
		return "cf[" + fieldName.substring(fieldName.indexOf('_') + 1) + "]";
	}

	private String _toJQLValue(String value) {
		value = value.replace("\\", "\\\\");

		return StringPool.QUOTE + value.replace("\"", "\\\"") +
			StringPool.QUOTE;
	}

	private String _toJQLValues(Collection<String> values) {
		List<String> jqlValues = new ArrayList<>();

		for (String value : values) {
			jqlValues.add(_toJQLValue(value));
		}

		return String.join(", ", jqlValues);
	}

	private static final Duration _CACHE_DURATION = Duration.ofDays(1);

	private static final String _FIELD_NAME_COMPONENTS = "components";

	private static final String _FIELD_NAME_DESCRIPTION = "description";

	private static final String _FIELD_NAME_RELEASE_TAGS = "customfield_10886";

	private static final String _FIELD_NAME_SUMMARY = "summary";

	private static final Duration _ISSUE_IDS_CACHE_DURATION =
		Duration.ofMinutes(10);

	private static final int _ISSUE_IDS_CACHE_MAX_ENTRIES = 50;

	private static final int _ISSUE_IDS_PAGE_SIZE = 5000;

	private static final String _PROJECT_KEY_COMPONENTS = "LPD";

	private static final String _RELEASE_KEY_7_4_GA = "7413-base";

	private static final String _RELEASE_KEY_PREFIX_7_4 = "7413-";

	private static final Duration _RETRY_DURATION = Duration.ofMinutes(5);

	private static final Log _log = LogFactory.getLog(
		ReleaseChangelogService.class);

	private static final Pattern _fixPackNumberPattern = Pattern.compile(
		"-\\D*(\\d+)$");
	private static final List<String> _projectKeys = List.of(
		"LPD", "LPE", "LPS");
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

	private final Map<String, IssueIdsCacheEntry> _issueIdsCacheEntries =
		new LinkedHashMap<>(16, 0.75F, true) {

			@Override
			protected boolean removeEldestEntry(
				Map.Entry<String, IssueIdsCacheEntry> entry) {

				if (size() > _ISSUE_IDS_CACHE_MAX_ENTRIES) {
					return true;
				}

				return false;
			}

		};

	@Autowired
	private JiraService _jiraService;

	@Value("${liferay.learn.jira.url}")
	private String _jiraURL;

	@Autowired
	private ReleaseNotesService _releaseNotesService;

	private static class IssueIdsCacheEntry {

		public Instant getExpirationInstant() {
			return _expirationInstant;
		}

		public long[] getIssueIds() {
			return _issueIds;
		}

		private IssueIdsCacheEntry(Instant expirationInstant, long[] issueIds) {
			_expirationInstant = expirationInstant;
			_issueIds = issueIds;
		}

		private final Instant _expirationInstant;
		private final long[] _issueIds;

	}

}