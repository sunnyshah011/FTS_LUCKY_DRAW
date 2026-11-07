import { useState } from "react";
import { parseCustomerCsv } from "../../utils/csvParser";
import { importCustomersDirect } from "../../services/customerImportService";

export default function ImportCustomers() {
  const [file, setFile] = useState(null);
  const [rows, setRows] = useState([]);
  const [msg, setMsg] = useState("");
  const [loading, setLoading] = useState(false);
  const [imported, setImported] = useState(false);
  const [summary, setSummary] = useState(null);

  async function preview() {
    if (!file) return;

    setRows([]);
    setSummary(null);
    setImported(false);
    setMsg("");

    try {
      const data = await parseCustomerCsv(file);

      if (!Array.isArray(data) || data.length === 0) {
        throw new Error(
          "No customer records found in the CSV file."
        );
      }

      // CSV structure: Name, Phone, Address
      const customers = data.map((row) => ({
        name: String(row.name || "").trim(),
        phone: String(row.phone || "").trim(),
        address: String(row.address || "").trim(),
      }));

      setRows(customers);

      const validCount = customers.filter(
        (row) => row.name && row.phone && row.address
      ).length;

      setMsg(
        `CSV preview ready: ${customers.length} records found, ${validCount} appear valid.`
      );

    } catch (error) {
      setMsg(error.message || "Unable to read CSV file.");
    }
  }

  async function uploadCustomers() {
    if (!rows.length || loading || imported) return;

    const confirmed = window.confirm(
      `Import ${rows.length} CSV records into Khushi Bazar Lucky Draw?`
    );

    if (!confirmed) return;

    setLoading(true);
    setMsg("");
    setSummary(null);

    try {
      const result = await importCustomersDirect(rows);

      setImported(true);

      setSummary({
        existingCount: result.existingCount,
        importedCount: result.importedCount,

        duplicateCount: result.duplicateCount,
        invalidCount: result.invalidCount,

        duplicateCustomers: result.duplicateCustomers || [],
        invalidCustomers: result.invalidCustomers || [],

        totalParticipants: result.totalParticipants,
        luckyNumberRange: result.luckyNumberRange,
        remainingCapacity: result.remainingCapacity,
      });

      setMsg("Customer import process completed successfully.");

    } catch (error) {
      console.error("Customer import failed:", error);

      setMsg(
        error.message || "Customer import failed."
      );

    } finally {
      setLoading(false);
    }
  }

  return (
    <section className="max-w-3xl">

      <h1 className="text-3xl font-bold">
        Import <span className="gold">Customers</span>
      </h1>

      <p className="text-stone-400 my-3">
        Upload your Google Forms CSV export.
        Expected columns: Name, Phone and Address.
      </p>

      <div className="panel p-6">

        {/* CSV File */}
        <label className="block text-sm text-stone-300 mb-2">
          Select CSV File
        </label>

        <input
          type="file"
          accept=".csv,text/csv"
          className="block w-full text-sm"
          disabled={loading}
          onChange={(e) => {
            setFile(e.target.files?.[0] || null);
            setRows([]);
            setMsg("");
            setSummary(null);
            setImported(false);
          }}
        />

        {/* Preview Button */}
        <button
          type="button"
          className="btn mt-5"
          onClick={preview}
          disabled={!file || loading}
        >
          Preview CSV
        </button>

        {/* Message */}
        {msg && (
          <p className="text-amber-200 mt-4 break-words">
            {msg}
          </p>
        )}

        {/* Customer Preview */}
        {rows.length > 0 && (
          <div className="mt-6">

            <div className="flex justify-between items-center mb-3">

              <p className="gold font-semibold">
                Customer Preview
              </p>

              <span className="text-sm text-stone-400">
                {rows.length} records
              </span>

            </div>

            <div className="max-h-72 overflow-auto text-sm">

              {rows.slice(0, 10).map((customer, index) => (
                <div
                  className="border-t border-white/10 py-3"
                  key={index}
                >

                  <p className="font-semibold">
                    {customer.name || "Missing name"}
                  </p>

                  <p className="text-stone-400">
                    {customer.phone || "Missing phone"}{" "}
                    ·{" "}
                    {customer.address || "Missing address"}
                  </p>

                </div>
              ))}

            </div>

            {rows.length > 10 && (
              <p className="text-xs text-stone-400 mt-2">
                Showing first 10 of {rows.length} records.
              </p>
            )}

            {/* Import Button */}
            <button
              type="button"
              className="btn w-full mt-5"
              onClick={uploadCustomers}
              disabled={loading || imported}
            >
              {loading
                ? "Importing Customers..."
                : imported
                  ? "Import Completed"
                  : `Import ${rows.length} CSV Records`}
            </button>

          </div>
        )}

        {/* Import Summary */}
        {summary && (
          <div className="mt-7 border-t border-white/10 pt-6">

            <h2 className="text-xl font-bold gold mb-4">
              Import Summary
            </h2>

            {/* Summary Cards */}
            <div className="grid grid-cols-2 md:grid-cols-3 gap-3">

              <SummaryCard
                label="Previously Registered"
                value={summary.existingCount}
              />

              <SummaryCard
                label="Newly Imported"
                value={summary.importedCount}
              />

              <SummaryCard
                label="Duplicates Skipped"
                value={summary.duplicateCount}
              />

              <SummaryCard
                label="Invalid Records"
                value={summary.invalidCount}
              />

              <SummaryCard
                label="Total Participants"
                value={summary.totalParticipants}
              />

              <SummaryCard
                label="Remaining Capacity"
                value={summary.remainingCapacity}
              />

            </div>

            {/* Duplicate Customer List */}
            {summary.duplicateCustomers.length > 0 && (
              <div className="mt-6 rounded-xl border border-amber-300/30 bg-amber-300/5 p-5">

                <div className="flex justify-between items-center mb-4">

                  <h3 className="font-bold text-amber-300">
                    Duplicates Skipped
                  </h3>

                  <span className="text-sm text-amber-200">
                    {summary.duplicateCount} Customers
                  </span>

                </div>

                <div className="max-h-60 overflow-y-auto">

                  {summary.duplicateCustomers.map(
                    (customer, index) => (
                      <div
                        key={index}
                        className="border-t border-white/10 py-3"
                      >

                        <p className="font-semibold text-white">
                          {customer.name}
                        </p>

                        <p className="text-sm text-stone-400">
                          {customer.phone} ·{" "}
                          {customer.address}
                        </p>

                        <p className="text-xs text-amber-300 mt-1">
                          {customer.reason}
                        </p>

                      </div>
                    )
                  )}

                </div>

              </div>
            )}

            {/* Invalid Customer List */}
            {summary.invalidCustomers.length > 0 && (
              <div className="mt-4 rounded-xl border border-red-300/30 bg-red-300/5 p-5">

                <div className="flex justify-between items-center mb-4">

                  <h3 className="font-bold text-red-300">
                    Invalid Records
                  </h3>

                  <span className="text-sm text-red-200">
                    {summary.invalidCount} Customers
                  </span>

                </div>

                <div className="max-h-60 overflow-y-auto">

                  {summary.invalidCustomers.map(
                    (customer, index) => (
                      <div
                        key={index}
                        className="border-t border-white/10 py-3"
                      >

                        <p className="font-semibold text-white">
                          {customer.name}
                        </p>

                        <p className="text-sm text-stone-400">
                          {customer.phone || "Empty phone"}{" "}
                          ·{" "}
                          {customer.address || "Empty address"}
                        </p>

                        <p className="text-xs text-red-300 mt-1">
                          {customer.reason}
                        </p>

                      </div>
                    )
                  )}

                </div>

              </div>
            )}

            {/* Lucky Number Range */}
            <div className="mt-5 rounded-xl border border-amber-300/30 bg-amber-300/5 p-5 text-center">

              <p className="text-sm text-stone-400">
                CURRENT LUCKY NUMBER RANGE
              </p>

              <p className="text-4xl font-black gold mt-2">
                {summary.luckyNumberRange}
              </p>

              <p className="text-xs text-stone-400 mt-2">
                Existing lucky numbers are preserved.
              </p>

            </div>

          </div>
        )}

      </div>

      <p className="text-xs text-amber-300 mt-4">
        Only authorized administrators can import customer records.
      </p>

    </section>
  );
}

// Summary Card Component
function SummaryCard({ label, value }) {
  return (
    <div className="rounded-xl border border-white/10 bg-white/5 p-4">

      <p className="text-xs text-stone-400">
        {label}
      </p>

      <p className="text-2xl font-bold mt-2">
        {value ?? 0}
      </p>

    </div>
  );
}