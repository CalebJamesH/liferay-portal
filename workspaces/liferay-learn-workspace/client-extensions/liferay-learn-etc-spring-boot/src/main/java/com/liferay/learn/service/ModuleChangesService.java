/**
 * SPDX-FileCopyrightText: (c) 2026 Liferay, Inc. https://liferay.com
 * SPDX-License-Identifier: LGPL-2.1-or-later OR LicenseRef-Liferay-DXP-EULA-2.0.0-2023-06
 */

package com.liferay.learn.service;

import com.liferay.client.extension.util.spring.boot3.service.BaseService;
import com.liferay.learn.model.Artifact;
import com.liferay.petra.string.CharPool;
import com.liferay.petra.string.StringBundler;
import com.liferay.petra.string.StringPool;
import com.liferay.portal.kernel.util.ArrayUtil;
import com.liferay.portal.kernel.util.HashMapBuilder;
import com.liferay.portal.kernel.util.StringUtil;
import com.liferay.portal.kernel.util.Validator;

import java.util.ArrayList;
import java.util.Collections;
import java.util.Comparator;
import java.util.HashMap;
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
import org.springframework.http.HttpStatus;
import org.springframework.http.HttpStatusCode;
import org.springframework.stereotype.Component;
import org.springframework.web.reactive.function.client.WebClientResponseException;
import org.springframework.web.util.UriComponentsBuilder;

/**
 * @author Caleb Hall
 */
@Component
public class ModuleChangesService extends BaseService {

	public static final String OWNER_COMMERCE = "commerce";

	public static final String OWNER_LIFERAY = "liferay";

	public static final String OWNER_THIRD_PARTY = "third-party";

	public JSONArray getModuleChangesJSONArray(
			String fromReleaseKey, String toReleaseKey, boolean changesOnly,
			String keywords, Set<String> owners)
		throws Exception {

		Map<String, Artifact> fromSnapshotArtifacts = _getSnapshotArtifacts(
			fromReleaseKey);
		Map<String, Artifact> toSnapshotArtifacts = _getSnapshotArtifacts(
			toReleaseKey);

		Map<String, Artifact> fromArtifacts = fromSnapshotArtifacts;
		Map<String, Artifact> toArtifacts = toSnapshotArtifacts;

		if ((fromArtifacts == null) || (toArtifacts == null)) {
			fromArtifacts = _getBOMArtifacts(
				fromReleaseKey, fromSnapshotArtifacts);
			toArtifacts = _getBOMArtifacts(toReleaseKey, toSnapshotArtifacts);
		}

		if ((fromArtifacts == null) || (toArtifacts == null)) {
			return null;
		}

		Map<String, Artifact> artifacts = HashMapBuilder.putAll(
			fromArtifacts
		).putAll(
			toArtifacts
		).build();

		List<Artifact> sortedArtifacts = new ArrayList<>(artifacts.values());

		sortedArtifacts.sort(
			Comparator.comparing(
				Artifact::getGroup
			).thenComparing(
				Artifact::getName
			));

		keywords = StringUtil.toLowerCase(StringUtil.trim(keywords));

		JSONArray jsonArray = new JSONArray();

		for (Artifact artifact : sortedArtifacts) {
			if (!owners.contains(artifact.getOwner())) {
				continue;
			}

			Artifact fromArtifact = fromArtifacts.get(artifact.getKey());
			Artifact toArtifact = toArtifacts.get(artifact.getKey());

			if (changesOnly && (fromArtifact != null) && (toArtifact != null) &&
				Objects.equals(
					fromArtifact.getVersion(), toArtifact.getVersion())) {

				continue;
			}

			if (Validator.isNotNull(keywords)) {
				String group = StringUtil.toLowerCase(artifact.getGroup());
				String name = StringUtil.toLowerCase(artifact.getName());

				if (!group.contains(keywords) && !name.contains(keywords)) {
					continue;
				}
			}

			jsonArray.put(
				new JSONObject(
				).put(
					"fromURL", _getURL(fromArtifact)
				).put(
					"fromVersion", _getVersion(fromArtifact)
				).put(
					"group", artifact.getGroup()
				).put(
					"name", artifact.getName()
				).put(
					"owner", artifact.getOwner()
				).put(
					"toURL", _getURL(toArtifact)
				).put(
					"toVersion", _getVersion(toArtifact)
				));
		}

		return jsonArray;
	}

	private void _addBOMArtifacts(
			Map<String, Artifact> artifacts, String bomArtifactId, String owner,
			String targetPlatformVersion)
		throws Exception {

		String pom = get(
			Collections.emptyMap(),
			UriComponentsBuilder.fromUriString(
				StringBundler.concat(
					_bomURL, StringPool.SLASH, bomArtifactId, StringPool.SLASH,
					targetPlatformVersion, StringPool.SLASH, bomArtifactId,
					StringPool.DASH, targetPlatformVersion, ".pom")
			).build(
			).toUri());

		Matcher matcher = _dependencyPattern.matcher(pom);

		while (matcher.find()) {
			String dependency = matcher.group(1);

			String group = _getElementText(dependency, _groupIdPattern);
			String name = _getElementText(dependency, _artifactIdPattern);
			String version = _getElementText(dependency, _versionPattern);

			if (Validator.isNull(group) || Validator.isNull(name) ||
				Validator.isNull(version)) {

				continue;
			}

			String artifactOwner = owner;

			if (artifactOwner == null) {
				if (group.equals(_GROUP_COMMERCE)) {
					artifactOwner = OWNER_COMMERCE;
				}
				else {
					artifactOwner = OWNER_LIFERAY;
				}
			}

			Artifact artifact = new Artifact(
				group, name, artifactOwner, _PACKAGING_JAR, version);

			artifacts.put(artifact.getKey(), artifact);
		}
	}

	private Map<String, Artifact> _getBOMArtifacts(String releaseKey)
		throws Exception {

		String targetPlatformVersion =
			_releaseNotesService.getTargetPlatformVersion(releaseKey);

		if ((targetPlatformVersion == null) ||
			ArrayUtil.contains(_bomExcludedVersions, targetPlatformVersion)) {

			return null;
		}

		String cacheKey = "bom:" + releaseKey;

		Map<String, Artifact> artifacts = _artifactsMap.get(cacheKey);

		if (artifacts != null) {
			return artifacts;
		}

		artifacts = new HashMap<>();

		try {
			_addBOMArtifacts(
				artifacts, "release.dxp.bom", null, targetPlatformVersion);
			_addBOMArtifacts(
				artifacts, "release.dxp.bom.third.party", OWNER_THIRD_PARTY,
				targetPlatformVersion);
		}
		catch (WebClientResponseException webClientResponseException) {
			HttpStatusCode httpStatusCode =
				webClientResponseException.getStatusCode();

			if (httpStatusCode.value() != HttpStatus.NOT_FOUND.value()) {
				throw webClientResponseException;
			}

			if (_log.isInfoEnabled()) {
				_log.info("No BOM found for " + targetPlatformVersion);
			}

			return null;
		}

		artifacts = Collections.unmodifiableMap(artifacts);

		_artifactsMap.put(cacheKey, artifacts);

		return artifacts;
	}

	private Map<String, Artifact> _getSnapshotArtifacts(String releaseKey)
		throws Exception {

		String cacheKey = "snapshot:" + releaseKey;

		Map<String, Artifact> artifacts = _artifactsMap.get(cacheKey);

		if (artifacts != null) {
			return artifacts;
		}

		artifacts = _releaseSnapshotService.getArtifacts(releaseKey);

		if (artifacts == null) {
			return null;
		}

		artifacts = Collections.unmodifiableMap(artifacts);

		_artifactsMap.put(cacheKey, artifacts);

		return artifacts;
	}

	private Map<String, Artifact> _getBOMArtifacts(
			String releaseKey, Map<String, Artifact> snapshotArtifacts)
		throws Exception {

		if ((snapshotArtifacts != null) && snapshotArtifacts.isEmpty()) {
			return snapshotArtifacts;
		}

		return _getBOMArtifacts(releaseKey);
	}

	private String _getElementText(String xml, Pattern pattern) {
		Matcher matcher = pattern.matcher(xml);

		if (matcher.find()) {
			return StringUtil.trim(matcher.group(1));
		}

		return StringPool.BLANK;
	}

	private String _getURL(Artifact artifact) {
		if ((artifact == null) ||
			!Objects.equals(artifact.getPackaging(), _PACKAGING_JAR)) {

			return null;
		}

		String repositoryURL = _REPOSITORY_URL_PUBLIC;

		if (Objects.equals(artifact.getOwner(), OWNER_THIRD_PARTY)) {
			repositoryURL = _REPOSITORY_URL_THIRD_PARTY;
		}

		return StringBundler.concat(
			repositoryURL,
			StringUtil.replace(
				artifact.getGroup(), CharPool.PERIOD, CharPool.SLASH),
			StringPool.SLASH, artifact.getName(), StringPool.SLASH,
			artifact.getVersion(), StringPool.SLASH, artifact.getName(),
			StringPool.DASH, artifact.getVersion(), ".jar");
	}

	private String _getVersion(Artifact artifact) {
		if (artifact == null) {
			return null;
		}

		return artifact.getVersion();
	}

	private static final int _ARTIFACTS_MAP_MAX_SIZE = 32;

	private static final String _GROUP_COMMERCE = "com.liferay.commerce";

	private static final String _PACKAGING_JAR = "jar";

	private static final String _REPOSITORY_URL_PUBLIC =
		"https://repository-cdn.liferay.com/nexus/content/repositories" +
			"/liferay-public-releases/";

	private static final String _REPOSITORY_URL_THIRD_PARTY =
		"https://repository-cdn.liferay.com/nexus/content/repositories/public/";

	private static final Pattern _artifactIdPattern = Pattern.compile(
		"<artifactId>([^<]*)</artifactId>");
	private static final Pattern _dependencyPattern = Pattern.compile(
		"<dependency>(.*?)</dependency>", Pattern.DOTALL);
	private static final Pattern _groupIdPattern = Pattern.compile(
		"<groupId>([^<]*)</groupId>");
	private static final Log _log = LogFactory.getLog(
		ModuleChangesService.class);

	private static final Pattern _versionPattern = Pattern.compile(
		"<version>([^<]*)</version>");

	private final Map<String, Map<String, Artifact>> _artifactsMap =
		Collections.synchronizedMap(
			new LinkedHashMap<String, Map<String, Artifact>>(16, 0.75F, true) {

				@Override
				protected boolean removeEldestEntry(
					Map.Entry<String, Map<String, Artifact>> entry) {

					if (size() > _ARTIFACTS_MAP_MAX_SIZE) {
						return true;
					}

					return false;
				}

			});

	@Value("${liferay.learn.release.notes.bom.excluded.versions}")
	private String[] _bomExcludedVersions;

	@Value("${liferay.learn.release.notes.bom.url}")
	private String _bomURL;

	@Autowired
	private ReleaseNotesService _releaseNotesService;

	@Autowired
	private ReleaseSnapshotService _releaseSnapshotService;

}