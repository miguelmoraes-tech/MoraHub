import ExcelJS from "exceljs";

export type ExportColumn<T> = {
  header: string;
  width?: number;
  value: (row: T) => string | number | boolean | Date | null;
};

export async function buildXlsxResponse<T>(
  filenamePrefix: string,
  sheetName: string,
  columns: ExportColumn<T>[],
  rows: T[]
) {
  const workbook = new ExcelJS.Workbook();
  const sheet = workbook.addWorksheet(sheetName);

  sheet.columns = columns.map((column) => ({
    header: column.header,
    width: column.width ?? 24,
  }));
  sheet.getRow(1).font = { bold: true };

  for (const row of rows) {
    sheet.addRow(columns.map((column) => column.value(row) ?? ""));
  }

  const buffer = await workbook.xlsx.writeBuffer();
  const today = new Date().toISOString().slice(0, 10);
  const filename = `${filenamePrefix}-${today}.xlsx`;

  return new Response(buffer, {
    headers: {
      "Content-Type":
        "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
      "Content-Disposition": `attachment; filename="${filename}"`,
    },
  });
}
