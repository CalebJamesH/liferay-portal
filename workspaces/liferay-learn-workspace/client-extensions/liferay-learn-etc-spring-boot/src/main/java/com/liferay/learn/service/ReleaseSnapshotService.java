/**
 * SPDX-FileCopyrightText: (c) 2026 Liferay, Inc. https://liferay.com
 * SPDX-License-Identifier: LGPL-2.1-or-later OR LicenseRef-Liferay-DXP-EULA-2.0.0-2023-06
 */

package com.liferay.learn.service;

import com.liferay.learn.model.Artifact;
import com.liferay.petra.string.CharPool;
import com.liferay.portal.kernel.util.StringUtil;

import java.io.BufferedReader;
import java.io.IOException;
import java.io.InputStream;
import java.io.InputStreamReader;

import java.nio.charset.StandardCharsets;

import java.util.ArrayList;
import java.util.HashMap;
import java.util.LinkedHashMap;
import java.util.List;
import java.util.Map;
import java.util.zip.GZIPInputStream;

import org.json.JSONArray;
import org.json.JSONObject;

import org.springframework.stereotype.Component;

/**
 * @author Caleb Hall
 */
@Component
public class ReleaseSnapshotService {

	public synchronized Map<String, Artifact> getArtifacts(String releaseKey)
		throws IOException {

		_load();

		String productVersion = _productVersions.get(releaseKey);

		if (productVersion == null) {
			return null;
		}

		int index = _releaseKeysMap.get(
			productVersion
		).indexOf(
			releaseKey
		);

		Map<String, Artifact> artifacts = new HashMap<>();

		for (ArtifactInterval artifactInterval :
				_artifactIntervalsMap.get(productVersion)) {

			if ((artifactInterval.getFirstIndex() <= index) &&
				(index <= artifactInterval.getLastIndex())) {

				Artifact artifact = artifactInterval.getArtifact();

				artifacts.put(artifact.getKey(), artifact);
			}
		}

		return artifacts;
	}

	public synchronized List<JSONObject> getProductVersionJSONObjects()
		throws IOException {

		_load();

		List<JSONObject> productVersionJSONObjects = new ArrayList<>();

		for (Map.Entry<String, List<String>> entry :
				_releaseKeysMap.entrySet()) {

			JSONArray releasesJSONArray = new JSONArray();

			for (String releaseKey : entry.getValue()) {
				releasesJSONArray.put(
					new JSONObject(
					).put(
						"key", releaseKey
					).put(
						"name", _releaseNames.get(releaseKey)
					));
			}

			productVersionJSONObjects.add(
				new JSONObject(
				).put(
					"key", entry.getKey()
				).put(
					"line", entry.getKey()
				).put(
					"name", "DXP " + entry.getKey()
				).put(
					"releases", releasesJSONArray
				));
		}

		return productVersionJSONObjects;
	}

	private void _load() throws IOException {
		if (_artifactIntervalsMap != null) {
			return;
		}

		Map<String, String> productVersions = new HashMap<>();
		Map<String, List<String>> releaseKeysMap = new LinkedHashMap<>();
		Map<String, String> releaseNames = new HashMap<>();

		try (InputStream inputStream =
				ReleaseSnapshotService.class.getResourceAsStream(
					_RELEASES_FILE_NAME)) {

			for (String[] values : _readCSV(inputStream)) {
				String productVersion = values[0];
				String releaseKey = values[1];

				productVersions.put(releaseKey, productVersion);

				List<String> releaseKeys = releaseKeysMap.computeIfAbsent(
					productVersion, key -> new ArrayList<>());

				releaseKeys.add(releaseKey);

				releaseNames.put(releaseKey, values[2]);
			}
		}

		Map<String, List<ArtifactInterval>> artifactIntervalsMap =
			new HashMap<>();
		Map<String, String> strings = new HashMap<>();

		try (InputStream inputStream = new GZIPInputStream(
				ReleaseSnapshotService.class.getResourceAsStream(
					_ARTIFACTS_FILE_NAME))) {

			for (String[] values : _readCSV(inputStream)) {
				String productVersion = values[0];

				List<String> releaseKeys = releaseKeysMap.get(productVersion);

				List<ArtifactInterval> artifactIntervals =
					artifactIntervalsMap.computeIfAbsent(
						productVersion, key -> new ArrayList<>());

				artifactIntervals.add(
					new ArtifactInterval(
						new Artifact(
							strings.computeIfAbsent(values[1], key -> key),
							strings.computeIfAbsent(values[2], key -> key),
							strings.computeIfAbsent(values[3], key -> key),
							strings.computeIfAbsent(values[4], key -> key),
							values[5]),
						releaseKeys.indexOf(values[6]),
						releaseKeys.indexOf(values[7])));
			}
		}

		_productVersions = productVersions;
		_releaseKeysMap = releaseKeysMap;
		_releaseNames = releaseNames;

		_artifactIntervalsMap = artifactIntervalsMap;
	}

	private List<String[]> _readCSV(InputStream inputStream)
		throws IOException {

		List<String[]> rows = new ArrayList<>();

		try (BufferedReader bufferedReader = new BufferedReader(
				new InputStreamReader(inputStream, StandardCharsets.UTF_8))) {

			String line = bufferedReader.readLine();

			while ((line = bufferedReader.readLine()) != null) {
				rows.add(StringUtil.split(line, CharPool.COMMA));
			}
		}

		return rows;
	}

	private static final String _ARTIFACTS_FILE_NAME =
		"/release-notes/artifacts.csv.gz";

	private static final String _RELEASES_FILE_NAME =
		"/release-notes/releases.csv";

	private Map<String, List<ArtifactInterval>> _artifactIntervalsMap;
	private Map<String, String> _productVersions;
	private Map<String, List<String>> _releaseKeysMap;
	private Map<String, String> _releaseNames;

	private static class ArtifactInterval {

		public Artifact getArtifact() {
			return _artifact;
		}

		public int getFirstIndex() {
			return _firstIndex;
		}

		public int getLastIndex() {
			return _lastIndex;
		}

		private ArtifactInterval(
			Artifact artifact, int firstIndex, int lastIndex) {

			_artifact = artifact;
			_firstIndex = firstIndex;
			_lastIndex = lastIndex;
		}

		private final Artifact _artifact;
		private final int _firstIndex;
		private final int _lastIndex;

	}

}