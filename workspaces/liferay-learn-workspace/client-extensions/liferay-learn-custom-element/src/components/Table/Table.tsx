/**
 * SPDX-FileCopyrightText: (c) 2000 Liferay, Inc. https://liferay.com
 * SPDX-License-Identifier: LGPL-2.1-or-later OR LicenseRef-Liferay-DXP-EULA-2.0.0-2023-06
 */

import ClayTable from '@clayui/table';
import {ReactNode} from 'react';

export interface IColumn {
	className?: string;
	columnKey: string;
	label: string;
}

export interface IRow {
	className?: string;
	id?: string;
	link?: string;
	[key: string]: ReactNode;
}

interface IProps {
	className?: string;
	columns: IColumn[];
	noWrap?: boolean;
	onRowClick?: (row: IRow) => void;
	rows: IRow[];
}

const Table = ({className, columns, noWrap, onRowClick, rows}: IProps) => {
	return (
		<ClayTable
			borderless
			className={className}
			noWrap={noWrap}
			striped={false}
		>
			<ClayTable.Head align="left">
				<ClayTable.Row>
					{columns.map((column) => (
						<ClayTable.Cell
							className={column.className}
							headingCell
							key={column.columnKey}
						>
							{column.label}
						</ClayTable.Cell>
					))}
				</ClayTable.Row>
			</ClayTable.Head>

			<ClayTable.Body align="left">
				{rows.map((row, index) => (
					<ClayTable.Row
						className={row.className}
						key={row.id ?? index}
						onClick={() => onRowClick && onRowClick(row)}
					>
						{columns.map((column) => (
							<ClayTable.Cell
								className={column.className}
								key={column.columnKey}
							>
								{row[column.columnKey]}
							</ClayTable.Cell>
						))}
					</ClayTable.Row>
				))}
			</ClayTable.Body>
		</ClayTable>
	);
};

export default Table;
