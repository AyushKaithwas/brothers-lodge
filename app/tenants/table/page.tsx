"use client";

import React, { useState, useEffect } from "react";
import { formatDate } from "@/lib/utils";
import Link from "next/link";

// Define types based on your schema
interface Room {
  id: number;
  name: string;
  rentAmount: number;
  periodFrom: string;
  periodTo: string;
  tenants: Tenant[];
}

interface Tenant {
  id: number;
  name: string;
  fatherName: string;
  villageName: string;
  tehsil: string;
  policeStation: string;
  district: string;
  pincode: string;
  state: string;
  email: string | null;
  aadharNumber: string;
  phoneNumber: string;
  fatherPhoneNumber: string;
  roomId: number;
  room?: Room;
}

// Group tenants by room for display
interface GroupedRoom extends Room {
  personCount: number;
}

// List of all available columns for reference
const ALL_COLUMNS = {
  name: "Name",
  fatherName: "Father's Name",
  phoneNumber: "Mobile No.",
  fatherPhoneNumber: "Father's Mobile",
  villageName: "Village",
  tehsil: "Tehsil",
  policeStation: "Police Station",
  district: "District",
  state: "State",
  pincode: "Pincode",
  aadharNumber: "Aadhar Number",
  email: "Email",
  rentAmount: "Rent Amount",
  periodFrom: "Period From",
  periodTo: "Period To",
};

export default function TenantTableView() {
  const [rooms, setRooms] = useState<GroupedRoom[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [simplifiedPrint, setSimplifiedPrint] = useState(false);
  const [visibleColumns, setVisibleColumns] = useState({
    name: true,
    fatherName: true,
    phoneNumber: true,
    fatherPhoneNumber: true,
    villageName: true,
    tehsil: true,
    policeStation: true,
    district: true,
    state: true,
    pincode: false,
    aadharNumber: true,
    email: false,
    rentAmount: true,
    periodFrom: false,
    periodTo: true,
  });

  // Toggle column visibility
  const toggleColumn = (column: keyof typeof visibleColumns) => {
    setVisibleColumns((prev) => ({
      ...prev,
      [column]: !prev[column],
    }));
  };

  // Print the table with current settings
  const handlePrint = () => {
    window.print();
  };

  // Print with simplified layout (fewer columns)
  const handleSimplifiedPrint = () => {
    setSimplifiedPrint(true);
    setTimeout(() => {
      window.print();
      // Reset after printing
      setTimeout(() => {
        setSimplifiedPrint(false);
      }, 500);
    }, 200);
  };

  // Fetch all rooms with their tenants
  useEffect(() => {
    const fetchRoomsWithTenants = async () => {
      try {
        setLoading(true);

        // First fetch all rooms
        const roomsResponse = await fetch("/api/rooms");
        if (!roomsResponse.ok) {
          throw new Error("Failed to fetch rooms");
        }

        const roomsData = await roomsResponse.json();

        // For each room, fetch its tenants
        const roomsWithTenants = await Promise.all(
          roomsData.map(async (room: Room) => {
            const tenantsResponse = await fetch(
              `/api/rooms/${room.id}/tenants`
            );
            if (tenantsResponse.ok) {
              const tenants = await tenantsResponse.json();
              return {
                ...room,
                tenants,
                personCount: tenants.length,
              };
            }
            return {
              ...room,
              tenants: [],
              personCount: 0,
            };
          })
        );

        // Sort rooms by name
        roomsWithTenants.sort((a: Room, b: Room) => {
          // Sort ground floor first, then first floor, then second floor
          if (a.name.startsWith("G") && !b.name.startsWith("G")) return -1;
          if (!a.name.startsWith("G") && b.name.startsWith("G")) return 1;
          if (a.name.startsWith("F") && b.name.startsWith("S")) return -1;
          if (a.name.startsWith("S") && b.name.startsWith("F")) return 1;

          // Within the same floor, sort by room number
          const aNum = parseInt(a.name.replace(/\D/g, "")) || 0;
          const bNum = parseInt(b.name.replace(/\D/g, "")) || 0;
          return aNum - bNum;
        });

        setRooms(roomsWithTenants as GroupedRoom[]);
        setError(null);
      } catch (err) {
        console.error("Error fetching data:", err);
        setError("Failed to load data. Please refresh the page.");
      } finally {
        setLoading(false);
      }
    };

    fetchRoomsWithTenants();
  }, []);

  // Get list of visible columns
  const getVisibleColumnNames = () => {
    if (simplifiedPrint) {
      // Only show essential columns in simplified print mode
      return [
        "name",
        "phoneNumber",
        "villageName",
        "district",
        "state",
        "rentAmount",
        "periodTo",
      ];
    }

    return Object.entries(visibleColumns)
      .filter(([, isVisible]) => isVisible)
      .map(([name]) => name);
  };

  // Check if column should be visible in current print mode
  const shouldShowColumn = (column: string): boolean => {
    if (simplifiedPrint) {
      // Only show essential columns in simplified print mode
      const essentialColumns = [
        "name",
        "phoneNumber",
        "villageName",
        "district",
        "state",
        "rentAmount",
        "periodTo",
      ];
      return essentialColumns.includes(column);
    }

    return isColumnVisible(column);
  };

  // Check if column is visible
  const isColumnVisible = (columnName: string) => {
    return columnName in visibleColumns
      ? visibleColumns[columnName as keyof typeof visibleColumns]
      : true;
  };

  // Helper to check if a date is default/uninitiated
  const isDefaultDate = (dateStr: string): boolean => {
    // Check if the date is the default/empty date
    if (!dateStr) return true;

    const date = new Date(dateStr);
    // Check if date is today or close to it (within 1 day)
    const today = new Date();
    const timeDiff = Math.abs(date.getTime() - today.getTime());
    const dayDiff = Math.ceil(timeDiff / (1000 * 3600 * 24));
    return dayDiff <= 1;
  };

  // Get user-friendly column name
  const getColumnDisplayName = (columnName: string) => {
    return ALL_COLUMNS[columnName as keyof typeof ALL_COLUMNS] || columnName;
  };

  // Safely get tenant property as string
  const getTenantValue = (tenant: Tenant, key: string): React.ReactNode => {
    if (key in tenant) {
      const value = tenant[key as keyof Tenant];
      // Ensure we're not trying to render an object
      if (typeof value === "object" && value !== null) {
        return "N/A";
      }
      return value !== null && value !== undefined ? value : "N/A";
    }
    return "N/A";
  };

  return (
    <div
      className={`container mx-auto p-4 ${
        simplifiedPrint ? "simplified-print" : ""
      }`}
    >
      {/* Print-specific styles */}
      <style jsx global>{`
        /* Print-specific styles */
        @media print {
          /* Layout adjustments */
          body {
            width: 100%;
            margin: 0;
            padding: 0;
          }

          /* Hide non-essential elements */
          .no-print {
            display: none !important;
          }

          /* Ensure landscape orientation */
          @page {
            size: landscape;
            margin: 0.5cm;
          }

          /* Table styles for print */
          table {
            width: 100% !important;
            table-layout: fixed !important;
            border-collapse: collapse !important;
            border-spacing: 0 !important;
            page-break-inside: auto !important;
            font-size: 7pt !important;
          }

          th,
          td {
            padding: 3px 4px !important;
            font-size: 7pt !important;
            overflow: hidden !important;
            text-overflow: ellipsis !important;
            white-space: normal !important;
            page-break-inside: avoid !important;
            border: 0.5px solid #ddd !important;
            max-width: 1.5cm !important;
            word-break: break-word !important;
          }

          /* Column width distribution */
          th:nth-child(1),
          td:nth-child(1) {
            width: 8% !important;
          } /* Room No */
          th:nth-child(2),
          td:nth-child(2) {
            width: 5% !important;
          } /* No. of Person */

          /* Room-specific columns */
          th[data-column="rentAmount"],
          td[data-column="rentAmount"] {
            width: 7% !important;
            text-align: right !important;
          }
          th[data-column="periodFrom"],
          td[data-column="periodFrom"],
          th[data-column="periodTo"],
          td[data-column="periodTo"] {
            width: 7% !important;
          }

          /* Tenant columns */
          th[data-column="name"],
          td[data-column="name"],
          th[data-column="fatherName"],
          td[data-column="fatherName"] {
            width: 10% !important;
          }
          th[data-column="phoneNumber"],
          td[data-column="phoneNumber"],
          th[data-column="fatherPhoneNumber"],
          td[data-column="fatherPhoneNumber"],
          th[data-column="aadharNumber"],
          td[data-column="aadharNumber"],
          th[data-column="pincode"],
          td[data-column="pincode"] {
            width: 7% !important;
          }
          th[data-column="villageName"],
          td[data-column="villageName"],
          th[data-column="tehsil"],
          td[data-column="tehsil"],
          th[data-column="policeStation"],
          td[data-column="policeStation"],
          th[data-column="district"],
          td[data-column="district"],
          th[data-column="state"],
          td[data-column="state"] {
            width: 7% !important;
          }

          /* Show all columns when printing, regardless of visibility settings */
          .print-only {
            display: table-cell !important;
          }

          /* Hide certain columns in simplified print mode */
          .simplified-hide {
            display: none !important;
          }

          /* Adjust widths for simplified print mode */
          .simplified-print table {
            font-size: 9pt !important;
          }

          .simplified-print th,
          .simplified-print td {
            font-size: 9pt !important;
            padding: 5px !important;
            max-width: none !important;
          }

          /* Make sure rows don't break across pages */
          tr {
            page-break-inside: avoid !important;
          }

          /* Ensure proper page breaks */
          .page-break-before {
            page-break-before: always !important;
          }

          /* Ensure room names are visible */
          .room-cell {
            font-weight: bold !important;
            color: #b91c1c !important;
          }
        }
      `}</style>

      <div className="flex justify-between items-center mb-6">
        <h1 className="text-3xl font-bold">Tenant Registry</h1>
        <div className="flex gap-3">
          <button
            onClick={handlePrint}
            className="bg-gray-600 text-white px-4 py-2 rounded hover:bg-gray-700 no-print"
            title="Print with all columns"
          >
            Print Full Table
          </button>
          <button
            onClick={handleSimplifiedPrint}
            className="bg-blue-600 text-white px-4 py-2 rounded hover:bg-blue-700 no-print"
            title="Print with fewer columns for better readability"
          >
            Print Readable Version
          </button>
          <Link
            href="/tenants"
            className="bg-green-600 text-white px-4 py-2 rounded hover:bg-green-700 no-print"
          >
            Manage Tenants
          </Link>
        </div>
      </div>

      {loading ? (
        <div className="text-center py-8 no-print">
          <p className="text-lg">Loading tenant data...</p>
        </div>
      ) : error ? (
        <div className="bg-red-100 text-red-700 p-4 rounded-md no-print">
          {error}
        </div>
      ) : (
        <>
          <div className="bg-white p-4 mb-6 rounded shadow no-print">
            <h2 className="text-lg font-semibold mb-3">Column Visibility</h2>
            <div className="flex flex-wrap gap-2">
              {Object.keys(ALL_COLUMNS).map((column) => (
                <div key={column} className="flex items-center">
                  <label className="flex items-center gap-1.5 px-3 py-1.5 bg-gray-100 rounded cursor-pointer hover:bg-gray-200">
                    <input
                      type="checkbox"
                      checked={isColumnVisible(column)}
                      onChange={() =>
                        toggleColumn(column as keyof typeof visibleColumns)
                      }
                      className="h-4 w-4"
                    />
                    {getColumnDisplayName(column)}
                  </label>
                </div>
              ))}
            </div>
          </div>

          <div className="overflow-x-auto">
            <table className="min-w-full bg-white border border-gray-300">
              <thead>
                <tr className="bg-gray-100 text-gray-700">
                  <th className="border border-gray-300 p-2 text-left">
                    Room No.
                  </th>
                  <th className="border border-gray-300 p-2 text-center">
                    No. of Person
                  </th>
                  {/* Visible columns for screen */}
                  {getVisibleColumnNames().map((column) => (
                    <th
                      key={column}
                      data-column={column}
                      className="border border-gray-300 p-2 text-left"
                    >
                      {getColumnDisplayName(column)}
                    </th>
                  ))}
                  {/* Hidden columns that only show when printing */}
                  {Object.keys(ALL_COLUMNS).map((column) => {
                    // Skip if already visible or shouldn't be shown in current print mode
                    if (
                      visibleColumns[column as keyof typeof visibleColumns] ||
                      !shouldShowColumn(column)
                    ) {
                      return null;
                    }

                    return (
                      <th
                        key={`print-${column}`}
                        data-column={column}
                        className="hidden print-only border border-gray-300 p-2 text-left"
                      >
                        {getColumnDisplayName(column)}
                      </th>
                    );
                  })}
                </tr>
              </thead>
              <tbody>
                {rooms.map((room) => {
                  const tenantCount = room.tenants.length;
                  return room.tenants.length > 0 ? (
                    // Rooms with tenants
                    room.tenants.map((tenant, index) => (
                      <tr
                        key={tenant.id}
                        className={index % 2 === 0 ? "bg-white" : "bg-gray-50"}
                      >
                        {index === 0 && (
                          <>
                            <td
                              className="border border-gray-300 p-2 font-semibold text-red-700 room-cell"
                              rowSpan={tenantCount}
                            >
                              {room.name}
                            </td>
                            <td
                              className="border border-gray-300 p-2 text-center"
                              rowSpan={tenantCount}
                            >
                              {tenantCount}
                            </td>
                          </>
                        )}
                        {/* Visible columns for screen */}
                        {getVisibleColumnNames().map((column) => {
                          // Handle room-specific columns
                          if (column === "rentAmount") {
                            return (
                              <td
                                key={column}
                                data-column={column}
                                className="border border-gray-300 p-2 text-center"
                              >
                                {room.rentAmount ? `₹${room.rentAmount}` : "-"}
                              </td>
                            );
                          }

                          if (
                            column === "periodFrom" ||
                            column === "periodTo"
                          ) {
                            const dateValue =
                              room[column as "periodFrom" | "periodTo"];
                            return (
                              <td
                                key={column}
                                data-column={column}
                                className="border border-gray-300 p-2 text-center"
                              >
                                {!isDefaultDate(dateValue)
                                  ? formatDate(new Date(dateValue))
                                  : "-"}
                              </td>
                            );
                          }

                          // Handle tenant-specific columns
                          return (
                            <td
                              key={column}
                              data-column={column}
                              className="border border-gray-300 p-2"
                            >
                              {getTenantValue(tenant, column)}
                            </td>
                          );
                        })}

                        {/* Hidden columns that only show when printing */}
                        {Object.keys(ALL_COLUMNS).map((column) => {
                          // Skip if already visible or shouldn't be shown in current print mode
                          if (
                            visibleColumns[
                              column as keyof typeof visibleColumns
                            ] ||
                            !shouldShowColumn(column)
                          ) {
                            return null;
                          }

                          // Handle room-specific columns
                          if (column === "rentAmount") {
                            return (
                              <td
                                key={`print-${column}`}
                                data-column={column}
                                className="hidden print-only border border-gray-300 p-2 text-center"
                              >
                                {room.rentAmount ? `₹${room.rentAmount}` : "-"}
                              </td>
                            );
                          }

                          if (
                            column === "periodFrom" ||
                            column === "periodTo"
                          ) {
                            const dateValue =
                              room[column as "periodFrom" | "periodTo"];
                            return (
                              <td
                                key={`print-${column}`}
                                data-column={column}
                                className="hidden print-only border border-gray-300 p-2 text-center"
                              >
                                {!isDefaultDate(dateValue)
                                  ? formatDate(new Date(dateValue))
                                  : "-"}
                              </td>
                            );
                          }

                          // Handle tenant-specific columns
                          return (
                            <td
                              key={`print-${column}`}
                              data-column={column}
                              className="hidden print-only border border-gray-300 p-2"
                            >
                              {getTenantValue(tenant, column)}
                            </td>
                          );
                        })}
                      </tr>
                    ))
                  ) : (
                    // Empty rooms
                    <tr key={room.id}>
                      <td className="border border-gray-300 p-2 font-semibold text-red-700 room-cell">
                        {room.name}
                      </td>
                      <td className="border border-gray-300 p-2 text-center">
                        0
                      </td>
                      {/* Visible columns for empty rooms */}
                      {getVisibleColumnNames().map((column) => {
                        if (column === "rentAmount") {
                          return (
                            <td
                              key={column}
                              data-column={column}
                              className="border border-gray-300 p-2 text-center"
                            >
                              {room.rentAmount ? `₹${room.rentAmount}` : "-"}
                            </td>
                          );
                        }

                        if (column === "periodFrom" || column === "periodTo") {
                          const dateValue =
                            room[column as "periodFrom" | "periodTo"];
                          return (
                            <td
                              key={column}
                              data-column={column}
                              className="border border-gray-300 p-2 text-center"
                            >
                              {!isDefaultDate(dateValue)
                                ? formatDate(new Date(dateValue))
                                : "-"}
                            </td>
                          );
                        }

                        return (
                          <td
                            key={column}
                            data-column={column}
                            className="border border-gray-300 p-2"
                          >
                            -
                          </td>
                        );
                      })}

                      {/* Hidden columns for printing (empty rooms) */}
                      {Object.keys(ALL_COLUMNS).map((column) => {
                        // Skip if already visible or shouldn't be shown in current print mode
                        if (
                          visibleColumns[
                            column as keyof typeof visibleColumns
                          ] ||
                          !shouldShowColumn(column)
                        ) {
                          return null;
                        }

                        if (column === "rentAmount") {
                          return (
                            <td
                              key={`print-${column}`}
                              data-column={column}
                              className="hidden print-only border border-gray-300 p-2 text-center"
                            >
                              {room.rentAmount ? `₹${room.rentAmount}` : "-"}
                            </td>
                          );
                        }

                        if (column === "periodFrom" || column === "periodTo") {
                          const dateValue =
                            room[column as "periodFrom" | "periodTo"];
                          return (
                            <td
                              key={`print-${column}`}
                              data-column={column}
                              className="hidden print-only border border-gray-300 p-2 text-center"
                            >
                              {!isDefaultDate(dateValue)
                                ? formatDate(new Date(dateValue))
                                : "-"}
                            </td>
                          );
                        }

                        return (
                          <td
                            key={`print-${column}`}
                            data-column={column}
                            className="hidden print-only border border-gray-300 p-2"
                          >
                            -
                          </td>
                        );
                      })}
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </>
      )}
    </div>
  );
}
