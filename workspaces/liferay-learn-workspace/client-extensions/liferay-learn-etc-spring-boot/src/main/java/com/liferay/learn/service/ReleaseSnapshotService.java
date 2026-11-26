/**
 * SPDX-FileCopyrightText: (c) 2026 Liferay, Inc. https://liferay.com
 * SPDX-License-Identifier: LGPL-2.1-or-later OR LicenseRef-Liferay-DXP-EULA-2.0.0-2023-06
 */

package com.liferay.learn.service;

import com.liferay.learn.model.Artifact;

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

import org.apache.commons.csv.CSVFormat;
import org.apache.commons.csv.CSVParser;
import org.apache.commons.csv.CSVRecord;

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

		List<String> releaseKeys = _releaseKeysMap.get(productVersion);

		int index = releaseKeys.indexOf(releaseKey);

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

		for (Map.Entry<String, List<String>> releaseKeysEntry :
				_releaseKeysMap.entrySet()) {

			JSONArray releasesJSONArray = new JSONArray();

			for (String releaseKey : releaseKeysEntry.getValue()) {
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
					"key", releaseKeysEntry.getKey()
				).put(
					"line", releaseKeysEntry.getKey()
				).put(
					"name", "DXP " + releaseKeysEntry.getKey()
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

		try (CSVParser csvParser = _getCSVParser(
				ReleaseSnapshotService.class.getResourceAsStream(
					"/release-notes/releases.csv"))) {

			for (CSVRecord csvRecord : csvParser) {
				String key = csvRecord.get("key");
				String productVersion = csvRecord.get("productVersion");

				productVersions.put(key, productVersion);

				List<String> releaseKeys = releaseKeysMap.computeIfAbsent(
					productVersion, k -> new ArrayList<>());

				releaseKeys.add(key);

				releaseNames.put(key, csvRecord.get("name"));
			}
		}

		Map<String, List<ArtifactInterval>> artifactIntervalsMap =
			new HashMap<>();

		try (CSVParser csvParser = _getCSVParser(
				new GZIPInputStream(
					ReleaseSnapshotService.class.getResourceAsStream(
						"/release-notes/artifacts.csv.gz")))) {

			for (CSVRecord csvRecord : csvParser) {
				String productVersion = csvRecord.get("productVersion");

				List<String> releaseKeys = releaseKeysMap.get(productVersion);

				List<ArtifactInterval> artifactIntervals =
					artifactIntervalsMap.computeIfAbsent(
						productVersion, key -> new ArrayList<>());

				String group = csvRecord.get("group");
				String name = csvRecord.get("name");
				String owner = csvRecord.get("owner");
				String packaging = csvRecord.get("packaging");

				Artifact artifact = new Artifact(
					group.intern(), name.intern(), owner.intern(),
					packaging.intern(), csvRecord.get("version"));

				artifactIntervals.add(
					new ArtifactInterval(
						artifact, releaseKeys.indexOf(csvRecord.get("first")),
						releaseKeys.indexOf(csvRecord.get("last"))));
			}
		}

		_artifactIntervalsMap = artifactIntervalsMap;
		_productVersions = productVersions;
		_releaseKeysMap = releaseKeysMap;
		_releaseNames = releaseNames;
	}

	private CSVParser _getCSVParser(InputStream inputStream)
		throws IOException {

		return CSVFormat.DEFAULT.withFirstRecordAsHeader(
		).parse(
			new InputStreamReader(inputStream, StandardCharsets.UTF_8)
		);
	}

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