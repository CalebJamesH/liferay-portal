/**
 * SPDX-FileCopyrightText: (c) 2026 Liferay, Inc. https://liferay.com
 * SPDX-License-Identifier: LGPL-2.1-or-later OR LicenseRef-Liferay-DXP-EULA-2.0.0-2023-06
 */

import {SVGProps} from 'react';

const GLASS_PATH =
	'M16.1619 3.20956C36.3089 -5.03633 61.5566 14.7708 41.9195 36.7882C37.3291 41.8887 30.1883 46.3942 23.1325 48.2644C18.0321 49.6246 12.9316 49.5395 8.9362 47.2443C-0.669845 41.8887 -3.0501 22.8467 4.34569 12.6456C7.74601 8.05507 11.8265 4.99474 16.1619 3.20956Z';

const DXPGlassIcon = (props: SVGProps<SVGSVGElement>) => (
	<svg
		fill="none"
		height="36"
		viewBox="0 0 36 36"
		width="36"
		xmlns="http://www.w3.org/2000/svg"
		{...props}
	>
		<svg
			height="31.406"
			preserveAspectRatio="none"
			viewBox="0 0 48.5973 55.8333"
			width="27.335"
			x="7.538"
			y="2.063"
		>
			<path
				clipRule="evenodd"
				d="M4.7593 6.72203C11.7301 -3.05403 31.112 -1.69388 41.5681 7.74214C61.2901 25.5091 35.7026 69.2888 11.7301 51.7769C11.1348 51.3518 10.5398 50.9268 9.94473 50.4167C2.37893 43.871 -3.74179 34.605 2.71895 10.9725C3.14398 9.35731 3.90902 7.99717 4.7593 6.72203Z"
				fill="url(#dxp-glass-icon-gradient)"
				fillRule="evenodd"
			/>

			<defs>
				<linearGradient
					gradientUnits="userSpaceOnUse"
					id="dxp-glass-icon-gradient"
					x1="41.2691"
					x2="9.66869"
					y1="-7.85612e-06"
					y2="45.7221"
				>
					<stop stopColor="#47FFFC" />
					<stop offset="0.514423" stopColor="#0B5FFF" />
					<stop offset="1" stopColor="#1514A4" />
				</linearGradient>
			</defs>
		</svg>

		<svg
			height="28.381"
			overflow="visible"
			preserveAspectRatio="none"
			viewBox="0 0 51.6148 50.4568"
			width="29.033"
			x="1.123"
			y="4.038"
		>
			<foreignObject height="55.8568" width="57.0148" x="-4" y="-2.7">
				<div
					style={{
						backdropFilter: 'blur(2px)',
						clipPath: 'url(#dxp-glass-icon-blur-clip)',
						height: '100%',
						width: '100%',
					}}
				/>
			</foreignObject>

			<g filter="url(#dxp-glass-icon-filter)">
				<path
					clipRule="evenodd"
					d={GLASS_PATH}
					fill="#99BCFF"
					fillOpacity="0.21"
					fillRule="evenodd"
					shapeRendering="crispEdges"
				/>
			</g>

			<defs>
				<filter
					colorInterpolationFilters="sRGB"
					filterUnits="userSpaceOnUse"
					height="55.8568"
					id="dxp-glass-icon-filter"
					width="57.0148"
					x="-4"
					y="-2.7"
				>
					<feFlood floodOpacity="0" result="BackgroundImageFix" />
					<feColorMatrix
						in="SourceAlpha"
						result="hardAlpha"
						type="matrix"
						values="0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 127 0"
					/>
					<feOffset dx="1.3" />
					<feGaussianBlur stdDeviation="0.65" />
					<feComposite in2="hardAlpha" operator="out" />
					<feColorMatrix
						type="matrix"
						values="0 0 0 0 0 0 0 0 0 0.344262 0 0 0 0 1 0 0 0 0.6 0"
					/>
					<feBlend
						in2="BackgroundImageFix"
						mode="normal"
						result="effect1_dropShadow"
					/>
					<feBlend
						in="SourceGraphic"
						in2="effect1_dropShadow"
						mode="normal"
						result="shape"
					/>
					<feColorMatrix
						in="SourceAlpha"
						result="hardAlpha"
						type="matrix"
						values="0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 127 0"
					/>
					<feOffset dy="1.5" />
					<feGaussianBlur stdDeviation="0.5" />
					<feComposite
						in2="hardAlpha"
						k2="-1"
						k3="1"
						operator="arithmetic"
					/>
					<feColorMatrix
						type="matrix"
						values="0 0 0 0 1 0 0 0 0 1 0 0 0 0 1 0 0 0 1 0"
					/>
					<feBlend
						in2="shape"
						mode="normal"
						result="effect2_innerShadow"
					/>
					<feColorMatrix
						in="SourceAlpha"
						result="hardAlpha"
						type="matrix"
						values="0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 127 0"
					/>
					<feOffset dy="3" />
					<feGaussianBlur stdDeviation="2.5" />
					<feComposite
						in2="hardAlpha"
						k2="-1"
						k3="1"
						operator="arithmetic"
					/>
					<feColorMatrix
						type="matrix"
						values="0 0 0 0 0.376471 0 0 0 0 0.623529 0 0 0 0 1 0 0 0 0.4 0"
					/>
					<feBlend
						in2="effect2_innerShadow"
						mode="normal"
						result="effect3_innerShadow"
					/>
				</filter>

				<clipPath
					id="dxp-glass-icon-blur-clip"
					transform="translate(4 2.7)"
				>
					<path
						clipRule="evenodd"
						d={GLASS_PATH}
						fillRule="evenodd"
					/>
				</clipPath>
			</defs>
		</svg>
	</svg>
);

export default DXPGlassIcon;
