function escapeCsvValue(value) {
  if (value === null || value === undefined) {
    return "";
  }
  const stringValue = String(value);
  if (stringValue.includes(",") || stringValue.includes('"') || stringValue.includes("\n")) {
    return `"${stringValue.replace(/"/g, '""')}"`;
  }
  return stringValue;
}

function toCsv(transactions) {
  const headers = ["id", "amount", "type", "category", "date", "description"];
  const lines = [headers.join(",")];

  for (const tx of transactions) {
    const row = headers.map((header) => escapeCsvValue(tx[header]));
    lines.push(row.join(","));
  }

  return lines.join("\n");
}

module.exports = { toCsv };
