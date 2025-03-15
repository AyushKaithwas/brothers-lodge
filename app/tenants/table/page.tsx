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

export default function TenantTableView() {
  const [rooms, setRooms] = useState<GroupedRoom[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
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
    return Object.entries(visibleColumns)
      .filter(([, isVisible]) => isVisible)
      .map(([name]) => name);
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
    const nameMap: Record<string, string> = {
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
    return nameMap[columnName] || columnName;
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
    <div className="container mx-auto p-4">
      <div className="flex justify-between items-center mb-6">
        <h1 className="text-3xl font-bold">Tenant Registry</h1>
        <Link
          href="/tenants"
          className="bg-blue-600 text-white px-4 py-2 rounded hover:bg-blue-700"
        >
          Manage Tenants
        </Link>
      </div>

      {loading ? (
        <div className="text-center py-8">
          <p className="text-lg">Loading tenant data...</p>
        </div>
      ) : error ? (
        <div className="bg-red-100 text-red-700 p-4 rounded-md">{error}</div>
      ) : (
        <>
          <div className="bg-white p-4 mb-6 rounded shadow">
            <h2 className="text-lg font-semibold mb-3">Column Visibility</h2>
            <div className="flex flex-wrap gap-2">
              {Object.keys(visibleColumns).map((column) => (
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
                  {getVisibleColumnNames().map((column) => (
                    <th
                      key={column}
                      className="border border-gray-300 p-2 text-left"
                    >
                      {getColumnDisplayName(column)}
                    </th>
                  ))}
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
                              className="border border-gray-300 p-2 font-semibold text-red-700"
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
                        {getVisibleColumnNames().map((column) => {
                          // Handle room-specific columns
                          if (column === "rentAmount") {
                            return (
                              <td
                                key={column}
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
                              className="border border-gray-300 p-2"
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
                      <td className="border border-gray-300 p-2 font-semibold text-red-700">
                        {room.name}
                      </td>
                      <td className="border border-gray-300 p-2 text-center">
                        0
                      </td>
                      {getVisibleColumnNames().map((column) => {
                        if (column === "rentAmount") {
                          return (
                            <td
                              key={column}
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
                            className="border border-gray-300 p-2"
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
