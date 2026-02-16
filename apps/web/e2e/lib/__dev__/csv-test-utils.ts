/**
 * CSV行からsteps列（JSON）を抽出する
 * JSONにはカンマが含まれるため、ダブルクォート内を考慮してパースする
 */
export function extractStepsJson(line: string): string {
  const columns: string[] = [];
  let current = "";
  let inQuotes = false;

  for (let i = 0; i < line.length; i++) {
    const char = line[i];
    if (char === '"') {
      if (inQuotes && line[i + 1] === '"') {
        current += '"';
        i++;
      } else {
        inQuotes = !inQuotes;
      }
    } else if (char === "," && !inQuotes) {
      columns.push(current);
      current = "";
    } else {
      current += char;
    }
  }
  columns.push(current);

  return columns[2];
}
