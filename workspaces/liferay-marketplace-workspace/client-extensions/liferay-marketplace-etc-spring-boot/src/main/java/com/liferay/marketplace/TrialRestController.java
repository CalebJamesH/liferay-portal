/**
 * SPDX-FileCopyrightText: (c) 2024 Liferay, Inc. https://liferay.com
 * SPDX-License-Identifier: LGPL-2.1-or-later OR LicenseRef-Liferay-DXP-EULA-2.0.0-2023-06
 */

package com.liferay.marketplace;

import com.liferay.client.extension.util.spring.boot3.BaseRestController;
import com.liferay.client.extension.util.spring.boot3.client.LiferayOAuth2AccessTokenManager;
import com.liferay.headless.admin.user.client.dto.v1_0.UserAccount;
import com.liferay.headless.commerce.admin.order.client.dto.v1_0.Order;
import com.liferay.headless.portal.instances.client.dto.v1_0.PortalInstance;
import com.liferay.headless.portal.instances.client.pagination.Page;
import com.liferay.marketplace.constants.MarketplaceConstants;
import com.liferay.marketplace.service.ConsoleService;
import com.liferay.marketplace.service.MarketplaceService;
import com.liferay.marketplace.service.TrialService;
import com.liferay.portal.kernel.util.GetterUtil;
import com.liferay.portal.kernel.util.HashMapBuilder;

import java.time.ZonedDateTime;
import java.time.format.DateTimeFormatter;

import java.util.HashMap;
import java.util.Map;
import java.util.Objects;

import org.apache.commons.logging.Log;
import org.apache.commons.logging.LogFactory;

import org.json.JSONObject;

import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.security.core.annotation.AuthenticationPrincipal;
import org.springframework.security.oauth2.jwt.Jwt;
import org.springframework.web.bind.annotation.DeleteMapping;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RequestParam;
import org.springframework.web.bind.annotation.RestController;
import org.springframework.web.util.UriComponentsBuilder;

/**
 * @author Keven Leone
 */
@RequestMapping("/trial")
@RestController
public class TrialRestController extends BaseRestController {

	@DeleteMapping("{orderId}")
	public void delete(@PathVariable long orderId) throws Exception {
		Order order = _marketplaceService.getOrder(orderId);

		JSONObject trialProvisioningContextJSONObject =
			_trialService.getTrialProvisioningContextJSONObject(order);

		_consoleService.deleteProject(
			trialProvisioningContextJSONObject.getString("projectId"));

		Map<String, String> customFields =
			(Map<String, String>)order.getCustomFields();

		_trialService.deletePortalInstance(
			orderId, trialProvisioningContextJSONObject,
			customFields.get("trial-virtual-host"));
	}

	@GetMapping("availability")
	public String getAvailability(
			@RequestParam(defaultValue = "SOLUTIONS7", required = false) String
				orderTypeExternalReferenceCode)
		throws Exception {

		Page<PortalInstance> page = _trialService.getPortalInstancesPage(
			_trialService.getTrialProvisioningContextJSONObject(
				_getOrder(orderTypeExternalReferenceCode)));

		return new JSONObject(
		).put(
			"active", _TRIAL_MAX_INSTANCES > page.getTotalCount()
		).put(
			"available", _TRIAL_MAX_INSTANCES - page.getTotalCount()
		).put(
			"max", _TRIAL_MAX_INSTANCES
		).toString();
	}

	@GetMapping("domain-availability/{projectPrefix}")
	public ResponseEntity<Void> getDomainAvailability(
			@PathVariable String projectPrefix,
			@RequestParam(defaultValue = "SSA_SAAS", required = false) String
				orderTypeExternalReferenceCode)
		throws Exception {

		JSONObject jsonObject =
			_trialService.getTrialProvisioningContextJSONObject(
				_getOrder(orderTypeExternalReferenceCode));

		String virtualHost =
			projectPrefix + "." + jsonObject.getString("domain");

		Page<PortalInstance> portalInstancesPage =
			_trialService.getPortalInstancesPage(jsonObject);

		for (PortalInstance portalInstance : portalInstancesPage.getItems()) {
			if (Objects.equals(virtualHost, portalInstance.getVirtualHost())) {
				return ResponseEntity.status(
					HttpStatus.CONFLICT
				).build();
			}
		}

		return ResponseEntity.status(
			HttpStatus.OK
		).build();
	}

	@PostMapping("expire/{orderId}")
	public void postExpire(@PathVariable long orderId) throws Exception {
		if (_log.isInfoEnabled()) {
			_log.info("Expired trial " + orderId);
		}

		_marketplaceService.updateOrder(
			null, orderId, MarketplaceConstants.ORDER_STATUS_PENDING);

		_marketplaceService.updateOrder(
			null, orderId, MarketplaceConstants.ORDER_STATUS_PROCESSING);

		_marketplaceService.updateOrder(
			null, orderId, MarketplaceConstants.ORDER_STATUS_COMPLETED);

		delete(orderId);
	}

	@PostMapping("extend/{id}")
	public void postExtend(@PathVariable long id) throws Exception {
		if (_log.isInfoEnabled()) {
			_log.info("Extend trial " + id);
		}

		JSONObject trialExtensionRequestJSONObject = new JSONObject(
			get(
				_liferayOAuth2AccessTokenManager.getAuthorization(
					"liferay-marketplace-etc-spring-boot-oahs"),
				UriComponentsBuilder.fromPath(
					"/o/c/trialextensionrequests/" + id
				).build(
				).toUri()));

		JSONObject dueStatusJSONObject =
			trialExtensionRequestJSONObject.getJSONObject("dueStatus");

		if (!(Objects.equals(
				dueStatusJSONObject.getString("key"), "Approved") ||
			  Objects.equals(
				  dueStatusJSONObject.getString("key"), "AutoApproved"))) {

			return;
		}

		Order order = _marketplaceService.getOrder(
			trialExtensionRequestJSONObject.getLong(
				"r_orderToTrialExtensionRequest_commerceOrderId"));

		Map<String, String> customFields =
			(Map<String, String>)order.getCustomFields();

		ZonedDateTime trialEndDateZonedDateTime = ZonedDateTime.parse(
			customFields.get("trial-end-date")
		).plusDays(
			trialExtensionRequestJSONObject.getInt("duration")
		);

		customFields.put(
			"trial-end-date",
			trialEndDateZonedDateTime.format(DateTimeFormatter.ISO_INSTANT));

		if (Objects.equals(dueStatusJSONObject.getString("key"), "Pending")) {
			patch(
				_liferayOAuth2AccessTokenManager.getAuthorization(
					"liferay-marketplace-etc-spring-boot-oahs"),
				new JSONObject(
				).put(
					"dueStatus", "Approved"
				).toString(),
				UriComponentsBuilder.fromPath(
					"/o/c/trialextensionrequests/" + id
				).build(
				).toUri());
		}

		_marketplaceService.updateOrder(
			customFields, order.getId(), order.getOrderStatus());
	}

	@PostMapping("notify-end/{orderId}")
	public void postNotifyEnd(@PathVariable long orderId) throws Exception {
		if (_log.isInfoEnabled()) {
			_log.info("Notify end " + orderId);
		}

		Order order = _marketplaceService.getOrder(orderId);

		UserAccount userAccount = _marketplaceService.getUserAccount(
			order.getCreatorEmailAddress());
		Map<String, String> customFields =
			(Map<String, String>)order.getCustomFields();

		_marketplaceService.postNotificationQueueEntry(
			order.getCreatorEmailAddress(), "TRIAL-EXPIRING-ORDER",
			new HashMapBuilder<String, Object>().put(
				"%TRIAL_CREATOR_FIRST_NAME%", userAccount.getGivenName()
			).put(
				"%TRIAL_END_DATE%",
				ZonedDateTime.parse(
					customFields.get("trial-end-date")
				).format(
					DateTimeFormatter.ofPattern("MMMM d, yyyy")
				)
			).build());

		customFields.put(
			"trial-notify-end-date",
			ZonedDateTime.now(
			).format(
				DateTimeFormatter.ISO_INSTANT
			));

		_marketplaceService.updateOrder(
			customFields, orderId, order.getOrderStatus());
	}

	@PostMapping("provisioning/{orderId}")
	public void postProvisioningOrder(
			@AuthenticationPrincipal Jwt jwt, @PathVariable long orderId)
		throws Exception {

		Order order = _marketplaceService.getOrder(orderId);

		_trialService.post(
			jwt,
			new JSONObject(
			).put(
				"classPK", orderId
			).put(
				"modelDTOOrder",
				new JSONObject(
				).put(
					"accountId", String.valueOf(order.getAccountId())
				).put(
					"creatorEmailAddress", order.getCreatorEmailAddress()
				).put(
					"orderStatus", order.getOrderStatus()
				)
			));
	}

	private Order _getOrder(String orderTypeExternalReferenceCode) {
		Order order = new Order();

		order.setCustomFields(() -> new HashMap<>());
		order.setOrderTypeExternalReferenceCode(
			() -> orderTypeExternalReferenceCode);

		return order;
	}

	private static final int _TRIAL_MAX_INSTANCES = GetterUtil.getInteger(
		System.getenv(
			"LIFERAY_MARKETPLACE_ETC_SPRING_BOOT_TRIAL_MAX_INSTANCES"),
		50);

	private static final Log _log = LogFactory.getLog(
		TrialRestController.class);

	@Autowired
	private ConsoleService _consoleService;

	@Value("${liferay.marketplace.console.ssa.cluster}")
	private String _consoleSSACluster;

	@Value("${liferay.marketplace.console.ssa.project.prefix}")
	private String _consoleSSAProjectPrefix;

	@Value("${liferay.marketplace.console.ssa.project.uid}")
	private String _consoleSSAProjectUid;

	@Value("${liferay.marketplace.console.cluster}")
	private String _consoleTrialCluster;

	@Value("${liferay.marketplace.console.project.prefix}")
	private String _consoleTrialProjectPrefix;

	@Value("${liferay.marketplace.console.project.uid}")
	private String _consoleTrialProjectUid;

	@Value("${external.ssa.oauth2.headless.server.home.page.url}")
	private String _externalSSAHomePageURL;

	@Value("${external.trial.oauth2.headless.server.home.page.url}")
	private String _externalTrialHomePageURL;

	@Autowired
	private LiferayOAuth2AccessTokenManager _liferayOAuth2AccessTokenManager;

	@Autowired
	private MarketplaceService _marketplaceService;

	@Value("${liferay.marketplace.trial.dxp.domain}")
	private String _trialDXPDomain;

	@Autowired
	private TrialService _trialService;

	@Value("${liferay.marketplace.trial.ssa.dxp.domain}")
	private String _trialSSADXPDomain;

}