/**
 * SPDX-FileCopyrightText: (c) 2026 Liferay, Inc. https://liferay.com
 * SPDX-License-Identifier: LGPL-2.1-or-later OR LicenseRef-Liferay-DXP-EULA-2.0.0-2023-06
 */

package com.liferay.learn.model;

import com.liferay.petra.string.StringPool;

/**
 * @author Caleb Hall
 */
public class Artifact {

	public Artifact(
		String group, String name, String owner, String packaging,
		String version) {

		_group = group;
		_name = name;
		_owner = owner;
		_packaging = packaging;
		_version = version;
	}

	public String getGroup() {
		return _group;
	}

	public String getKey() {
		return _group + StringPool.COLON + _name;
	}

	public String getName() {
		return _name;
	}

	public String getOwner() {
		return _owner;
	}

	public String getPackaging() {
		return _packaging;
	}

	public String getVersion() {
		return _version;
	}

	private final String _group;
	private final String _name;
	private final String _owner;
	private final String _packaging;
	private final String _version;

}