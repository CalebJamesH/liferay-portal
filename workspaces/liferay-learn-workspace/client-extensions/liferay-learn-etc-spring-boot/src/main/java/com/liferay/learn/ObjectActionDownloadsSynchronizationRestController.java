/**
 * SPDX-FileCopyrightText: (c) 2026 Liferay, Inc. https://liferay.com
 * SPDX-License-Identifier: LGPL-2.1-or-later OR LicenseRef-Liferay-DXP-EULA-2.0.0-2023-06
 */

package com.liferay.learn;

import com.liferay.client.extension.util.spring.boot3.BaseRestController;
import com.liferay.client.extension.util.spring.boot3.client.LiferayOAuth2AccessTokenManager;
import com.liferay.learn.service.DownloadsQuarterlySyncService;

import java.util.List;

import org.apache.commons.logging.Log;
import org.apache.commons.logging.LogFactory;

import org.json.JSONObject;

import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.security.core.annotation.AuthenticationPrincipal;
import org.springframework.security.oauth2.jwt.Jwt;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;
import org.springframework.web.util.UriComponentsBuilder;

/**
 * @author Caleb Hall
 */
@RequestMapping("/object/action/downloads/synchronization")
@RestController
public class ObjectActionDownloadsSynchronizationRestController
	extends BaseRestController {

	@PostMapping
	public ResponseEntity<String> post(
		@AuthenticationPrincipal Jwt jwt, @RequestBody String json) {

		if (_log.isInfoEnabled()) {
			_log.info("Started downloads synchronization");
		}

		int downloadAmount = 0;
		long startTime = System.currentTimeMillis();
		String synchronizationStatus = "failed";

		try {
			List<String> titles = _downloadsQuarterlySyncService.synchronize();

			downloadAmount = titles.size();

			synchronizationStatus = "successful";
		}
		catch (Exception exception) {
			_log.error("Unable to synchronize downloads", exception);
		}
		
		_updateDownloadsSynchronization(
				new JSONObject(
					json
				).getLong(
					"classPK"
				),
				downloadAmount, System.currentTimeMillis() - startTime,
				synchronizationStatus);

		if (_log.isInfoEnabled()) {
			_log.info("Finished downloads synchronization");
		}

		return new ResponseEntity<>(json, HttpStatus.OK);
	}

	private void _updateDownloadsSynchronization(
		Long classPK, int downloadAmount, long executionTime,
		String synchronizationStatus) {

		patch(
			_liferayOAuth2AccessTokenManager.getAuthorization(
				"liferay-learn-etc-spring-boot-oahs"),
			new JSONObject(
			).put(
				"downloadAmount", downloadAmount
			).put(
				"executionTime", executionTime
			).put(
				"synchronizationStatus", synchronizationStatus
			).toString(),
			UriComponentsBuilder.fromPath(
				"/o/c/p2s3downloadssynchronizations/" + classPK
			).build(
			).toUri());
	}

	private static final Log _log = LogFactory.getLog(
		ObjectActionDownloadsSynchronizationRestController.class);

	@Autowired
	private DownloadsQuarterlySyncService _downloadsQuarterlySyncService;

	@Autowired
	private LiferayOAuth2AccessTokenManager _liferayOAuth2AccessTokenManager;

}
