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
}

export default function TenantTableView() {
  const [rooms, setRooms] = useState<Room[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

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
              return { ...room, tenants };
            }
            return { ...room, tenants: [] };
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
          const aNum = parseInt(a.name.replace(/\D/g, ""));
          const bNum = parseInt(b.name.replace(/\D/g, ""));
          return aNum - bNum;
        });

        setRooms(roomsWithTenants);
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

  // Function to count number of people in a room
  const getPersonCount = (room: Room) => {
    return room.tenants.length;
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
        <div className="overflow-x-auto">
          <table className="min-w-full bg-white border border-gray-300">
            <thead>
              <tr className="bg-gray-100 text-gray-700">
                <th
                  className="border border-gray-300 p-2 text-left"
                  rowSpan={2}
                >
                  Room No.
                </th>
                <th
                  className="border border-gray-300 p-2 text-center"
                  rowSpan={2}
                >
                  No. of Person
                </th>
                <th
                  className="border border-gray-300 p-2 text-left"
                  rowSpan={2}
                >
                  Name
                </th>
                <th
                  className="border border-gray-300 p-2 text-left"
                  rowSpan={2}
                >
                  District
                </th>
                <th
                  className="border border-gray-300 p-2 text-left"
                  rowSpan={2}
                >
                  Mobile No.
                </th>
                <th
                  className="border border-gray-300 p-2 text-center"
                  colSpan={2}
                >
                  Period
                </th>
              </tr>
              <tr className="bg-gray-100 text-gray-700">
                <th className="border border-gray-300 p-2 text-center">From</th>
                <th className="border border-gray-300 p-2 text-center">To</th>
              </tr>
            </thead>
            <tbody>
              {rooms.map((room) => {
                const rowCount = Math.max(1, room.tenants.length);

                return (
                  <React.Fragment key={room.id}>
                    {room.tenants.length > 0 ? (
                      room.tenants.map((tenant, tIndex) => (
                        <tr
                          key={tenant.id}
                          className={
                            tIndex % 2 === 0 ? "bg-white" : "bg-gray-50"
                          }
                        >
                          {tIndex === 0 && (
                            <>
                              <td
                                className="border border-gray-300 p-2 font-semibold text-red-700"
                                rowSpan={rowCount}
                              >
                                {room.name}
                              </td>
                              <td
                                className="border border-gray-300 p-2 text-center"
                                rowSpan={rowCount}
                              >
                                {getPersonCount(room)}
                              </td>
                            </>
                          )}
                          <td className="border border-gray-300 p-2">
                            {tenant.name}
                          </td>
                          <td className="border border-gray-300 p-2">
                            {tenant.district}
                          </td>
                          <td className="border border-gray-300 p-2">
                            {tenant.phoneNumber}
                          </td>
                          {tIndex === 0 && (
                            <>
                              <td
                                className="border border-gray-300 p-2 text-center"
                                rowSpan={rowCount}
                              >
                                {room.periodFrom
                                  ? formatDate(new Date(room.periodFrom))
                                  : "N/A"}
                              </td>
                              <td
                                className="border border-gray-300 p-2 text-center"
                                rowSpan={rowCount}
                              >
                                {room.periodTo
                                  ? formatDate(new Date(room.periodTo))
                                  : "N/A"}
                              </td>
                            </>
                          )}
                        </tr>
                      ))
                    ) : (
                      <tr>
                        <td className="border border-gray-300 p-2 font-semibold text-red-700">
                          {room.name}
                        </td>
                        <td className="border border-gray-300 p-2 text-center">
                          0
                        </td>
                        <td className="border border-gray-300 p-2">-</td>
                        <td className="border border-gray-300 p-2">-</td>
                        <td className="border border-gray-300 p-2">-</td>
                        <td className="border border-gray-300 p-2 text-center">
                          {room.periodFrom
                            ? formatDate(new Date(room.periodFrom))
                            : "N/A"}
                        </td>
                        <td className="border border-gray-300 p-2 text-center">
                          {room.periodTo
                            ? formatDate(new Date(room.periodTo))
                            : "N/A"}
                        </td>
                      </tr>
                    )}
                  </React.Fragment>
                );
              })}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
