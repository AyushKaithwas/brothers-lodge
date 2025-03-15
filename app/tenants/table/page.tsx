"use client";

import React, { useState, useEffect } from "react";
import { formatDate } from "@/lib/utils";
import Link from "next/link";
import { Fragment } from "react";

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

      {/* Success message */}
      {actionSuccess && (
        <div className="bg-green-100 text-green-700 p-3 rounded-md mb-4 no-print">
          {actionSuccess}
        </div>
      )}

      {/* Error message */}
      {actionError && (
        <div className="bg-red-100 text-red-700 p-3 rounded-md mb-4 no-print">
          {actionError}
        </div>
      )}

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
                  {/* Actions column (not for print) */}
                  <th className="border border-gray-300 p-2 text-center no-print">
                    Actions
                  </th>
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

                        {/* Add Actions column for editing */}
                        <td className="border border-gray-300 p-2 text-center no-print">
                          <button
                            onClick={() => handleEditTenant(tenant)}
                            className="px-3 py-1 bg-blue-500 text-white rounded hover:bg-blue-600 mr-2"
                            title="Edit tenant information"
                          >
                            Edit
                          </button>
                          {index === 0 && (
                            <button
                              onClick={() =>
                                handleEmptyRoom(room.id, room.name)
                              }
                              className="px-3 py-1 bg-red-500 text-white rounded hover:bg-red-600"
                              title="Remove all tenants from this room"
                            >
                              Empty Room
                            </button>
                          )}
                        </td>

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

                      {/* Empty action cell for empty rooms */}
                      <td className="border border-gray-300 p-2 text-center no-print">
                        {/* No edit button for empty room */}
                      </td>

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

      {/* Edit Tenant Modal */}
      {isModalOpen && editingTenant && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 no-print">
          <div className="bg-white rounded-lg shadow-lg p-6 max-w-2xl w-full max-h-[90vh] overflow-y-auto">
            <div className="flex justify-between items-center mb-4">
              <h2 className="text-xl font-semibold">Edit Tenant</h2>
              <button
                onClick={closeModal}
                className="text-gray-500 hover:text-gray-700"
              >
                ✕
              </button>
            </div>

            {actionSuccess ? (
              <div className="bg-green-100 text-green-700 p-3 rounded-md mb-4">
                {actionSuccess}
              </div>
            ) : (
              <form onSubmit={handleTenantUpdate}>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  {/* Tenant Name */}
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      Tenant Name <span className="text-red-500">*</span>
                    </label>
                    <input
                      type="text"
                      name="name"
                      className="w-full p-2 border rounded-md"
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
                      className="w-full p-2 border rounded-md"
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
                      className="w-full p-2 border rounded-md"
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
                      className="w-full p-2 border rounded-md"
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
                      className="w-full p-2 border rounded-md"
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
                      className="w-full p-2 border rounded-md"
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
                      className="w-full p-2 border rounded-md"
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
                      className="w-full p-2 border rounded-md"
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
                      className="w-full p-2 border rounded-md"
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
                      className="w-full p-2 border rounded-md"
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
                      className="w-full p-2 border rounded-md"
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
                      className="w-full p-2 border rounded-md"
                      defaultValue={editingTenant.fatherPhoneNumber}
                      required
                      maxLength={10}
                      pattern="\d{10}"
                      title="Phone number must be 10 digits"
                    />
                  </div>
                </div>

                {actionError && (
                  <div className="bg-red-100 text-red-700 p-3 rounded-md my-4">
                    {actionError}
                  </div>
                )}

                <div className="flex justify-end mt-6 gap-2">
                  <button
                    type="button"
                    onClick={closeModal}
                    className="px-4 py-2 border border-gray-300 rounded-md shadow-sm text-sm font-medium text-gray-700 bg-white hover:bg-gray-50 focus:outline-none"
                  >
                    Cancel
                  </button>
                  <button
                    type="submit"
                    disabled={processingAction}
                    className="px-4 py-2 border border-transparent rounded-md shadow-sm text-sm font-medium text-white bg-blue-600 hover:bg-blue-700 focus:outline-none disabled:opacity-50"
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
