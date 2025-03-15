"use client";

import React, { useState, useEffect } from "react";
import { formatDate } from "@/lib/utils";
import Link from "next/link";
import { Fragment } from "react";
import { ChevronDown, Check, Filter } from "lucide-react";
import { cn } from "@/lib/utils";

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

// Group columns by category for better organization
const COLUMN_GROUPS = {
  "Personal Info": ["name", "fatherName", "email"],
  "Contact Info": ["phoneNumber", "fatherPhoneNumber"],
  "Address Info": [
    "villageName",
    "tehsil",
    "policeStation",
    "district",
    "state",
    "pincode",
  ],
  "Identity Info": ["aadharNumber"],
  "Room Info": ["rentAmount", "periodFrom", "periodTo"],
};

export default function TenantTableView() {
  const [rooms, setRooms] = useState<GroupedRoom[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [simplifiedPrint, setSimplifiedPrint] = useState(false);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingTenant, setEditingTenant] = useState<Tenant | null>(null);
  const [actionSuccess, setActionSuccess] = useState<string | null>(null);
  const [actionError, setActionError] = useState<string | null>(null);
  const [processingAction, setProcessingAction] = useState(false);
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

  // Column selector dropdown state
  const [isColumnSelectorOpen, setIsColumnSelectorOpen] = useState(false);

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

  // Function to handle tenant editing
  const handleEditTenant = (tenant: Tenant) => {
    setEditingTenant(tenant);
    setIsModalOpen(true);
  };

  // Function to handle tenant update submission
  const handleTenantUpdate = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    if (!editingTenant) return;

    setProcessingAction(true);
    setActionError(null);
    setActionSuccess(null);

    try {
      // Get form data
      const formData = new FormData(e.currentTarget);
      const updatedTenant = {
        id: editingTenant.id,
        name: formData.get("name") as string,
        fatherName: formData.get("fatherName") as string,
        villageName: formData.get("villageName") as string,
        tehsil: formData.get("tehsil") as string,
        policeStation: formData.get("policeStation") as string,
        district: formData.get("district") as string,
        pincode: formData.get("pincode") as string,
        state: formData.get("state") as string,
        email: (formData.get("email") as string) || null,
        phoneNumber: formData.get("phoneNumber") as string,
        fatherPhoneNumber: formData.get("fatherPhoneNumber") as string,
        aadharNumber: unformatAadharNumber(
          formData.get("aadharNumber") as string
        ),
        roomId: editingTenant.roomId,
      };

      // Validate fields
      if (
        !updatedTenant.name ||
        !updatedTenant.fatherName ||
        !isValidPhoneNumber(updatedTenant.phoneNumber) ||
        !isValidPhoneNumber(updatedTenant.fatherPhoneNumber) ||
        !isValidAadharNumber(updatedTenant.aadharNumber) ||
        !isValidPincode(updatedTenant.pincode)
      ) {
        setActionError("Please fill all required fields with valid data");
        setProcessingAction(false);
        return;
      }

      // Submit update
      const response = await fetch(`/api/tenants/${editingTenant.id}`, {
        method: "PATCH",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify(updatedTenant),
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || "Failed to update tenant");
      }

      setActionSuccess("Tenant updated successfully");

      // Close modal and refresh data
      setTimeout(() => {
        setIsModalOpen(false);
        fetchRoomsWithTenants();
      }, 1500);
    } catch (error) {
      console.error("Error updating tenant:", error);
      setActionError(
        error instanceof Error ? error.message : "Failed to update tenant"
      );
    } finally {
      setProcessingAction(false);
    }
  };

  // Function to close modal
  const closeModal = () => {
    setIsModalOpen(false);
    setEditingTenant(null);
    setActionError(null);
    setActionSuccess(null);
  };

  // Function to empty a room (delete all tenants)
  const handleEmptyRoom = async (roomId: number, roomName: string) => {
    // Confirm with user
    const confirmEmpty = window.confirm(
      `Are you sure you want to empty room ${roomName}? This will delete all tenant records for this room.`
    );

    if (!confirmEmpty) return;

    setProcessingAction(true);
    try {
      const response = await fetch(`/api/rooms/${roomId}/tenants`, {
        method: "DELETE",
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || "Failed to empty room");
      }

      const data = await response.json();
      setActionSuccess(
        `Room ${roomName} emptied successfully. ${data.count} tenant(s) removed.`
      );

      // Refresh data
      fetchRoomsWithTenants();
    } catch (error) {
      console.error("Error emptying room:", error);
      setActionError(
        error instanceof Error ? error.message : "Failed to empty room"
      );
    } finally {
      setProcessingAction(false);
    }
  };

  // Format Aadhar number with spaces after every 4 digits
  function formatAadharNumber(value: string): string {
    // Remove all non-digits
    const cleanedValue = value.replace(/\D/g, "");

    // Add spaces after every 4 digits
    const parts = [];
    for (let i = 0; i < cleanedValue.length && i < 12; i += 4) {
      parts.push(cleanedValue.substring(i, i + 4));
    }

    return parts.join(" ");
  }

  // Remove formatting (spaces) from Aadhar number
  function unformatAadharNumber(value: string): string {
    return value.replace(/\s/g, "");
  }

  // Check if the value is a valid phone number (10 digits)
  function isValidPhoneNumber(value: string): boolean {
    const cleanedValue = value.replace(/\D/g, "");
    return cleanedValue.length === 10;
  }

  // Check if the value is a valid Aadhar number (12 digits)
  function isValidAadharNumber(value: string): boolean {
    const cleanedValue = value.replace(/\D/g, "");
    return cleanedValue.length === 12;
  }

  // Check if the value is a valid pincode (6 digits)
  function isValidPincode(value: string): boolean {
    const cleanedValue = value.replace(/\D/g, "");
    return cleanedValue.length === 6;
  }

  // Modify the fetchRoomsWithTenants function to be callable directly
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
          const tenantsResponse = await fetch(`/api/rooms/${room.id}/tenants`);
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

  // Call the fetchRoomsWithTenants in the useEffect
  useEffect(() => {
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
  // const shouldShowColumn = (column: string): boolean => {
  //   if (simplifiedPrint) {
  //     const essentialColumns = [
  //       "name",
  //       "phoneNumber",
  //       "villageName",
  //       "district",
  //       "state",
  //       "rentAmount",
  //       "periodTo",
  //     ];
  //     return essentialColumns.includes(column);
  //   }
  //   return isColumnVisible(column);
  // };

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
      className={`container mx-auto p-6 ${
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

      <div className="flex justify-between items-center mb-8">
        <h1 className="text-3xl font-bold bg-gradient-to-r from-gray-900 to-gray-600 bg-clip-text text-transparent">
          Tenant Registry
        </h1>
        <div className="flex gap-3">
          <button
            onClick={handlePrint}
            className="px-4 py-2 bg-gray-900 text-white rounded-lg hover:bg-gray-800 transition-colors duration-200 no-print flex items-center gap-2 shadow-sm"
            title="Print with all columns"
          >
            <span>Print Full Table</span>
          </button>
          <button
            onClick={handleSimplifiedPrint}
            className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors duration-200 no-print flex items-center gap-2 shadow-sm"
            title="Print with fewer columns for better readability"
          >
            <span>Print Readable Version</span>
          </button>
          <Link
            href="/tenants"
            className="px-4 py-2 bg-emerald-600 text-white rounded-lg hover:bg-emerald-700 transition-colors duration-200 no-print flex items-center gap-2 shadow-sm"
          >
            Manage Tenants
          </Link>
        </div>
      </div>

      {/* Success message */}
      {actionSuccess && (
        <div className="bg-emerald-50 text-emerald-700 p-4 rounded-lg mb-6 no-print border border-emerald-200 flex items-center gap-2">
          <Check className="w-5 h-5" />
          <span>{actionSuccess}</span>
        </div>
      )}

      {/* Error message */}
      {actionError && (
        <div className="bg-red-50 text-red-700 p-4 rounded-lg mb-6 no-print border border-red-200">
          {actionError}
        </div>
      )}

      {loading ? (
        <div className="text-center py-12 no-print">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-gray-900 mx-auto mb-4"></div>
          <p className="text-lg text-gray-600">Loading tenant data...</p>
        </div>
      ) : error ? (
        <div className="bg-red-50 text-red-700 p-4 rounded-lg no-print border border-red-200">
          {error}
        </div>
      ) : (
        <>
          {/* Column Visibility Selector */}
          <div className="bg-white p-6 mb-8 rounded-lg shadow-sm border border-gray-200 no-print">
            <div className="flex items-center gap-4 mb-4">
              <h2 className="text-lg font-semibold text-gray-900">
                Customize View
              </h2>
              <div className="relative">
                <button
                  onClick={() => setIsColumnSelectorOpen(!isColumnSelectorOpen)}
                  className="flex items-center gap-2 px-4 py-2 text-sm font-medium text-gray-700 bg-white border border-gray-300 rounded-lg hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500"
                >
                  <Filter className="w-4 h-4" />
                  <span>Select Columns</span>
                  <ChevronDown
                    className={cn(
                      "w-4 h-4 transition-transform",
                      isColumnSelectorOpen && "transform rotate-180"
                    )}
                  />
                </button>

                {isColumnSelectorOpen && (
                  <div className="absolute z-10 mt-2 w-72 bg-white rounded-lg shadow-lg border border-gray-200 py-2">
                    {Object.entries(COLUMN_GROUPS).map(([group, columns]) => (
                      <div key={group} className="px-3 py-2">
                        <div className="text-sm font-medium text-gray-900 mb-2">
                          {group}
                        </div>
                        <div className="space-y-1">
                          {columns.map((column) => (
                            <label
                              key={column}
                              className="flex items-center gap-2 px-2 py-1 rounded hover:bg-gray-50 cursor-pointer text-sm"
                            >
                              <input
                                type="checkbox"
                                checked={isColumnVisible(column)}
                                onChange={() =>
                                  toggleColumn(
                                    column as keyof typeof visibleColumns
                                  )
                                }
                                className="w-4 h-4 text-blue-600 rounded border-gray-300 focus:ring-blue-500"
                              />
                              <span className="text-gray-700">
                                {
                                  ALL_COLUMNS[
                                    column as keyof typeof ALL_COLUMNS
                                  ]
                                }
                              </span>
                            </label>
                          ))}
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </div>
          </div>

          {/* Table */}
          <div className="overflow-x-auto bg-white rounded-lg shadow-sm border border-gray-200">
            <table className="min-w-full divide-y divide-gray-200">
              <thead>
                <tr className="bg-gray-50">
                  <th
                    scope="col"
                    className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider whitespace-nowrap"
                  >
                    Room No.
                  </th>
                  <th
                    scope="col"
                    className="px-4 py-3 text-center text-xs font-medium text-gray-500 uppercase tracking-wider whitespace-nowrap"
                  >
                    No. of Person
                  </th>
                  {/* Visible columns */}
                  {getVisibleColumnNames().map((column) => (
                    <th
                      key={column}
                      data-column={column}
                      scope="col"
                      className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider whitespace-nowrap"
                    >
                      {getColumnDisplayName(column)}
                    </th>
                  ))}
                  {/* Actions column */}
                  <th
                    scope="col"
                    className="px-4 py-3 text-center text-xs font-medium text-gray-500 uppercase tracking-wider whitespace-nowrap no-print"
                  >
                    Actions
                  </th>
                </tr>
              </thead>
              <tbody className="bg-white divide-y divide-gray-200">
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
                              className="px-4 py-3 font-medium text-red-700 whitespace-nowrap room-cell"
                              rowSpan={tenantCount}
                            >
                              {room.name}
                            </td>
                            <td
                              className="px-4 py-3 text-center text-gray-900 whitespace-nowrap"
                              rowSpan={tenantCount}
                            >
                              {tenantCount}
                            </td>
                          </>
                        )}
                        {/* Visible columns */}
                        {getVisibleColumnNames().map((column) => {
                          if (column === "rentAmount") {
                            return (
                              <td
                                key={column}
                                data-column={column}
                                className="px-4 py-3 text-right whitespace-nowrap text-gray-900"
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
                                className="px-4 py-3 whitespace-nowrap text-gray-900"
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
                              className="px-4 py-3 text-gray-900"
                            >
                              {getTenantValue(tenant, column)}
                            </td>
                          );
                        })}

                        {/* Actions */}
                        <td className="px-4 py-3 text-center whitespace-nowrap no-print">
                          <div className="flex items-center justify-center gap-2">
                            <button
                              onClick={() => handleEditTenant(tenant)}
                              className="inline-flex items-center px-3 py-1.5 text-sm font-medium text-white bg-blue-600 rounded-md hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 transition-colors duration-200"
                              title="Edit tenant information"
                            >
                              Edit
                            </button>
                            {index === 0 && (
                              <button
                                onClick={() =>
                                  handleEmptyRoom(room.id, room.name)
                                }
                                className="inline-flex items-center px-3 py-1.5 text-sm font-medium text-white bg-red-600 rounded-md hover:bg-red-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-red-500 transition-colors duration-200"
                                title="Remove all tenants from this room"
                              >
                                Empty Room
                              </button>
                            )}
                          </div>
                        </td>
                      </tr>
                    ))
                  ) : (
                    // Empty rooms
                    <tr>
                      <td className="px-4 py-3 font-medium text-red-700 whitespace-nowrap room-cell">
                        {room.name}
                      </td>
                      <td className="px-4 py-3 text-center text-gray-900 whitespace-nowrap">
                        0
                      </td>
                      {getVisibleColumnNames().map((column) => (
                        <td
                          key={column}
                          data-column={column}
                          className="px-4 py-3 text-gray-500"
                        >
                          -
                        </td>
                      ))}
                      <td className="px-4 py-3 text-center whitespace-nowrap no-print"></td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </>
      )}

      {/* Edit Tenant Modal */}
      {isModalOpen && editingTenant && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 no-print">
          <div className="bg-white rounded-lg shadow-xl p-6 max-w-2xl w-full max-h-[90vh] overflow-y-auto mx-4">
            <div className="flex justify-between items-center mb-6">
              <h2 className="text-xl font-semibold text-gray-900">
                Edit Tenant
              </h2>
              <button
                onClick={closeModal}
                className="text-gray-500 hover:text-gray-700 focus:outline-none"
              >
                <span className="sr-only">Close</span>
                <svg
                  className="h-6 w-6"
                  fill="none"
                  viewBox="0 0 24 24"
                  stroke="currentColor"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={2}
                    d="M6 18L18 6M6 6l12 12"
                  />
                </svg>
              </button>
            </div>

            {actionSuccess ? (
              <div className="bg-emerald-50 text-emerald-700 p-4 rounded-lg mb-4 border border-emerald-200 flex items-center gap-2">
                <Check className="w-5 h-5" />
                <span>{actionSuccess}</span>
              </div>
            ) : (
              <form onSubmit={handleTenantUpdate}>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  {/* Tenant Name */}
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      Tenant Name <span className="text-red-500">*</span>
                    </label>
                    <input
                      type="text"
                      name="name"
                      className="w-full p-2.5 text-gray-900 bg-white border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                      defaultValue={editingTenant.name}
                      required
                    />
                  </div>

                  {/* Father's Name */}
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      Father&apos;s Name <span className="text-red-500">*</span>
                    </label>
                    <input
                      type="text"
                      name="fatherName"
                      className="w-full p-2.5 text-gray-900 bg-white border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                      defaultValue={editingTenant.fatherName}
                      required
                    />
                  </div>

                  {/* Village Name */}
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      Village Name <span className="text-red-500">*</span>
                    </label>
                    <input
                      type="text"
                      name="villageName"
                      className="w-full p-2.5 text-gray-900 bg-white border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                      defaultValue={editingTenant.villageName}
                      required
                    />
                  </div>

                  {/* Tehsil */}
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      Tehsil <span className="text-red-500">*</span>
                    </label>
                    <input
                      type="text"
                      name="tehsil"
                      className="w-full p-2.5 text-gray-900 bg-white border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                      defaultValue={editingTenant.tehsil}
                      required
                    />
                  </div>

                  {/* Police Station */}
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      Police Station <span className="text-red-500">*</span>
                    </label>
                    <input
                      type="text"
                      name="policeStation"
                      className="w-full p-2.5 text-gray-900 bg-white border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                      defaultValue={editingTenant.policeStation}
                      required
                    />
                  </div>

                  {/* District */}
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      District <span className="text-red-500">*</span>
                    </label>
                    <input
                      type="text"
                      name="district"
                      className="w-full p-2.5 text-gray-900 bg-white border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                      defaultValue={editingTenant.district}
                      required
                    />
                  </div>

                  {/* Pincode */}
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      Pincode <span className="text-red-500">*</span>
                    </label>
                    <input
                      type="text"
                      name="pincode"
                      className="w-full p-2.5 text-gray-900 bg-white border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                      defaultValue={editingTenant.pincode}
                      required
                      maxLength={6}
                      pattern="\d{6}"
                      title="Pincode must be 6 digits"
                    />
                  </div>

                  {/* State */}
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      State <span className="text-red-500">*</span>
                    </label>
                    <input
                      type="text"
                      name="state"
                      className="w-full p-2.5 text-gray-900 bg-white border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                      defaultValue={editingTenant.state}
                      required
                    />
                  </div>

                  {/* Email */}
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      Email
                    </label>
                    <input
                      type="email"
                      name="email"
                      className="w-full p-2.5 text-gray-900 bg-white border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                      defaultValue={editingTenant.email || ""}
                    />
                  </div>

                  {/* Aadhar Number */}
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      Aadhar Number <span className="text-red-500">*</span>
                    </label>
                    <input
                      type="text"
                      name="aadharNumber"
                      className="w-full p-2.5 text-gray-900 bg-white border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                      defaultValue={formatAadharNumber(
                        editingTenant.aadharNumber
                      )}
                      required
                    />
                  </div>

                  {/* Phone Number */}
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      Phone Number <span className="text-red-500">*</span>
                    </label>
                    <input
                      type="tel"
                      name="phoneNumber"
                      className="w-full p-2.5 text-gray-900 bg-white border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                      defaultValue={editingTenant.phoneNumber}
                      required
                      maxLength={10}
                      pattern="\d{10}"
                      title="Phone number must be 10 digits"
                    />
                  </div>

                  {/* Father's Phone Number */}
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      Father&apos;s Phone Number{" "}
                      <span className="text-red-500">*</span>
                    </label>
                    <input
                      type="tel"
                      name="fatherPhoneNumber"
                      className="w-full p-2.5 text-gray-900 bg-white border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                      defaultValue={editingTenant.fatherPhoneNumber}
                      required
                      maxLength={10}
                      pattern="\d{10}"
                      title="Phone number must be 10 digits"
                    />
                  </div>
                </div>

                {actionError && (
                  <div className="bg-red-50 text-red-700 p-4 rounded-lg my-6 border border-red-200">
                    {actionError}
                  </div>
                )}

                <div className="flex justify-end mt-8 gap-3">
                  <button
                    type="button"
                    onClick={closeModal}
                    className="px-4 py-2 text-sm font-medium text-gray-700 bg-white border border-gray-300 rounded-lg hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 transition-colors duration-200"
                  >
                    Cancel
                  </button>
                  <button
                    type="submit"
                    disabled={processingAction}
                    className="px-4 py-2 text-sm font-medium text-white bg-blue-600 rounded-lg hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 transition-colors duration-200 disabled:opacity-50"
                  >
                    {processingAction ? "Saving..." : "Save Changes"}
                  </button>
                </div>
              </form>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
