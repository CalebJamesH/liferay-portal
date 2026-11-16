/**
 * SPDX-FileCopyrightText: (c) 2026 Liferay, Inc. https://liferay.com
 * SPDX-License-Identifier: LGPL-2.1-or-later OR LicenseRef-Liferay-DXP-EULA-2.0.0-2023-06
 */

package com.liferay.learn;

import com.liferay.client.extension.util.spring.boot3.BaseRestController;
import com.liferay.learn.constants.RoleConstants;
import com.liferay.learn.service.DownloadAgreementsService;
import com.liferay.learn.service.DownloadsService;
import com.liferay.petra.function.UnsafeFunction;
import com.liferay.portal.kernel.security.auth.PrincipalException;

import java.util.Set;

import org.apache.commons.logging.Log;
import org.apache.commons.logging.LogFactory;

import org.json.JSONArray;
import org.json.JSONObject;

import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.security.core.annotation.AuthenticationPrincipal;
import org.springframework.security.oauth2.jwt.Jwt;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RequestParam;
import org.springframework.web.bind.annotation.RestController;
import org.springframework.web.util.UriComponentsBuilder;

/**
 * @author Caleb Hall
 */
@RequestMapping("/downloads")
@RestController
public class DownloadsRestController extends BaseRestController {

	@PostMapping("/agreements/{agreementType}")
	public ResponseEntity<String> acceptAgreement(
		@PathVariable String agreementType, @AuthenticationPrincipal Jwt jwt) {

		return _getResponseEntity(
			jwt,
			userAccountJSONObject -> {
				if (!_downloadAgreementsService.isAgreementType(
						agreementType)) {

					return new ResponseEntity<>(HttpStatus.NOT_FOUND);
				}

				long userId = userAccountJSONObject.getLong("id");

				_downloadAgreementsService.acceptAgreement(
					agreementType, userId);

				return new ResponseEntity<>(
					_downloadAgreementsService.getAgreementsJSONObject(
						userId
					).toString(),
					HttpStatus.OK);
			});
	}

	@GetMapping("/agreements/{agreementType}/content")
	public ResponseEntity<String> getAgreementContent(
		@PathVariable String agreementType, @AuthenticationPrincipal Jwt jwt) {

		return _getResponseEntity(
			jwt,
			userAccountJSONObject -> {
				if (!_downloadAgreementsService.isAgreementType(
						agreementType)) {

					return new ResponseEntity<>(HttpStatus.NOT_FOUND);
				}

				String content = _downloadAgreementsService.getAgreementContent(
					agreementType);

				if (content == null) {
					return new ResponseEntity<>(HttpStatus.NOT_FOUND);
				}

				return new ResponseEntity<>(
					new JSONObject(
					).put(
						"content", content
					).toString(),
					HttpStatus.OK);
			});
	}

	@GetMapping("/agreements")
	public ResponseEntity<String> getAgreements(
		@AuthenticationPrincipal Jwt jwt) {

		return _getResponseEntity(
			jwt,
			userAccountJSONObject -> new ResponseEntity<>(
				_downloadAgreementsService.getAgreementsJSONObject(
					userAccountJSONObject.getLong("id")
				).toString(),
				HttpStatus.OK));
	}

	@GetMapping("/{urlTitle}")
	public ResponseEntity<String> getDownload(
		@AuthenticationPrincipal Jwt jwt, @PathVariable String urlTitle) {

		return _getResponseEntity(
			jwt,
			userAccountJSONObject -> {
				JSONObject downloadJSONObject =
					_downloadsService.getDownloadJSONObject(urlTitle);

				if (downloadJSONObject == null) {
					return new ResponseEntity<>(HttpStatus.NOT_FOUND);
				}

				return new ResponseEntity<>(
					downloadJSONObject.toString(), HttpStatus.OK);
			});
	}

	@GetMapping
	public ResponseEntity<String> getDownloads(
		@RequestParam(defaultValue = "", required = false) String fileType,
		@AuthenticationPrincipal Jwt jwt,
		@RequestParam(defaultValue = "1", required = false) int page,
		@RequestParam(defaultValue = "20", required = false) int pageSize,
		@RequestParam(defaultValue = "", required = false) String product) {

		return _getResponseEntity(
			jwt,
			userAccountJSONObject -> new ResponseEntity<>(
				_downloadsService.getDownloadsJSONObject(
					product, fileType, page, pageSize
				).toString(),
				HttpStatus.OK));
	}

	@GetMapping("/products")
	public ResponseEntity<String> getProducts(
		@AuthenticationPrincipal Jwt jwt) {

		return _getResponseEntity(
			jwt,
			userAccountJSONObject -> new ResponseEntity<>(
				_downloadsService.getProductsJSONArray(
				).toString(),
				HttpStatus.OK));
	}

	private JSONObject _getMyUserAccountJSONObject(Jwt jwt)
		throws PrincipalException {

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

	private ResponseEntity<String> _getResponseEntity(
		Jwt jwt,
		UnsafeFunction<JSONObject, ResponseEntity<String>, Exception>
			unsafeFunction) {

		try {
			JSONObject userAccountJSONObject = _getMyUserAccountJSONObject(jwt);

			if (!_hasPermission(userAccountJSONObject)) {
				return new ResponseEntity<>(
					new JSONObject(
					).put(
						"subscriptionURL", _subscriptionURL
					).toString(),
					HttpStatus.FORBIDDEN);
			}

			return unsafeFunction.apply(userAccountJSONObject);
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

	private boolean _hasPermission(JSONObject userAccountJSONObject) {
		JSONArray roleBriefsJSONArray = userAccountJSONObject.optJSONArray(
			"roleBriefs");

		if (roleBriefsJSONArray == null) {
			return false;
		}

		for (int i = 0; i < roleBriefsJSONArray.length(); i++) {
			JSONObject roleBriefJSONObject = roleBriefsJSONArray.getJSONObject(
				i);

			if (Set.of(
					RoleConstants.NAME_ADMINISTRATOR, RoleConstants.NAME_CUSTOMER)
					.contains(roleBriefJSONObject.optString("name"))) {
				return true;
			}
		}

		return false;
	}

	private static final Log _log = LogFactory.getLog(
		DownloadsRestController.class);

	@Autowired
	private DownloadAgreementsService _downloadAgreementsService;

	@Autowired
	private DownloadsService _downloadsService;

	@Value("${liferay.learn.downloads.subscription.url:}")
	private String _subscriptionURL;

}