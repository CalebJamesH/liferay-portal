/**
 * SPDX-FileCopyrightText: (c) 2026 Liferay, Inc. https://liferay.com
 * SPDX-License-Identifier: LGPL-2.1-or-later OR LicenseRef-Liferay-DXP-EULA-2.0.0-2023-06
 */

package com.liferay.learn;

import com.liferay.client.extension.util.spring.boot3.BaseRestController;
import com.liferay.learn.constants.RoleConstants;
import com.liferay.learn.service.ReleaseNotesService;
import com.liferay.portal.kernel.security.auth.PrincipalException;

import java.util.ArrayList;
import java.util.List;

import org.apache.commons.logging.Log;
import org.apache.commons.logging.LogFactory;

import org.json.JSONArray;
import org.json.JSONObject;

import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.security.core.annotation.AuthenticationPrincipal;
import org.springframework.security.oauth2.jwt.Jwt;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;
import org.springframework.web.util.UriComponentsBuilder;

/**
 * @author Caleb Hall
 */
@RequestMapping("/release-notes")
@RestController
public class ReleaseNotesRestController extends BaseRestController {

	@GetMapping("/releases")
	public ResponseEntity<String> getReleases(
		@AuthenticationPrincipal Jwt jwt) {

		try {
			if (!_hasReleaseNotesPermission(jwt)) {
				return new ResponseEntity<>(HttpStatus.FORBIDDEN);
			}

			JSONArray productVersionsJSONArray =
				_releaseNotesService.getProductVersionsJSONArray();

			return new ResponseEntity<>(
				productVersionsJSONArray.toString(), HttpStatus.OK);
		}
		catch (PrincipalException principalException) {
			if (_log.isDebugEnabled()) {
				_log.debug(principalException);
			}

			return new ResponseEntity<>(HttpStatus.FORBIDDEN);
		}
		catch (Exception exception) {
			_log.error(exception);

			return new ResponseEntity<>(HttpStatus.INTERNAL_SERVER_ERROR);
		}
	}

	private JSONObject _getMyUserAccountJSONObject(Jwt jwt) throws Exception {
		try {
			return new JSONObject(
				get(
					"Bearer " + jwt.getTokenValue(),
					UriComponentsBuilder.fromPath(
						"/o/headless-admin-user/v1.0/my-user-account"
					).build(
					).toUri()));
		}
		catch (Exception exception) {
			if (_log.isWarnEnabled()) {
				_log.warn("Unable to get user account", exception);
			}

			throw new PrincipalException();
		}
	}

	private List<String> _getUserRoleNames(Jwt jwt) throws Exception {
		List<String> roleNames = new ArrayList<>();

		JSONObject userJSONObject = _getMyUserAccountJSONObject(jwt);

		JSONArray roleBriefsJSONArray = userJSONObject.getJSONArray(
			"roleBriefs");

		for (int i = 0; i < roleBriefsJSONArray.length(); i++) {
			JSONObject roleBriefJSONObject = roleBriefsJSONArray.getJSONObject(
				i);

			roleNames.add(roleBriefJSONObject.getString("name"));
		}

		return roleNames;
	}

	private boolean _hasReleaseNotesPermission(Jwt jwt) throws Exception {
		List<String> userRoleNames = _getUserRoleNames(jwt);

		if (userRoleNames.contains(RoleConstants.NAME_ADMINISTRATOR) ||
			userRoleNames.contains(RoleConstants.NAME_CUSTOMER)) {

			return true;
		}

		return false;
	}

	private static final Log _log = LogFactory.getLog(
		ReleaseNotesRestController.class);

	@Autowired
	private ReleaseNotesService _releaseNotesService;

}