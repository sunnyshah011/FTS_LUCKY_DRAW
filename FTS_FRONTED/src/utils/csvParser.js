import Papa from "papaparse";
export function parseCustomerCsv(file) {
  return new Promise((resolve, reject) =>
    Papa.parse(file, {
      header: true,
      skipEmptyLines: true,
      complete: (r) => {
        const rows = r.data
          .map((row) => ({
            name: String(row.name ?? row.Name ?? row["Full Name"] ?? "").trim(),
            address: String(row.address ?? row.Address ?? "").trim(),
            phone: String(
              row.phone ?? row.Phone ?? row["Phone Number"] ?? "",
            ).trim(),
          }))
          .filter((x) => x.name && x.phone);
        resolve(rows);
      },
      error: reject,
    }),
  );
}
