"use client";

import { useState, useEffect } from "react";
import Autocomplete from "../components/ui/autocomplete";
import { formatDate, addMonths } from "@/lib/utils";

// Define types
interface Room {
  id: number;
  name: string;
  rentAmount: number;
  periodFrom: string;
  periodTo: string;
}

// Define an Option type for the Autocomplete component
interface Option {
  id: number;
  name: string;
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
  room: Room;
}

interface TenantFormData {
  name: string;
  fatherName: string;
  villageName: string;
  tehsil: string;
  policeStation: string;
  district: string;
  pincode: string;
  state: string;
  email: string;
  aadharNumber: string;
  phoneNumber: string;
  fatherPhoneNumber: string;
}

export default function TenantsPage() {
  // State for form
  const [selectedRoom, setSelectedRoom] = useState<Room | null>(null);
  const [tenantForms, setTenantForms] = useState<TenantFormData[]>([
    createEmptyTenantForm(),
  ]);
  const [periodFrom, setPeriodFrom] = useState<string>(
    new Date().toISOString().split("T")[0]
  );
  const [rentAmount, setRentAmount] = useState<string>("");

  // State for data and UI
  const [rooms, setRooms] = useState<Room[]>([]);
  const [tenants, setTenants] = useState<Tenant[]>([]);
  const [loading, setLoading] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);

  // Fetch rooms on component mount
  useEffect(() => {
    const fetchRooms = async () => {
      try {
        const response = await fetch("/api/rooms");
        if (response.ok) {
          const data = await response.json();
          setRooms(data);
        } else {
          throw new Error("Failed to fetch rooms");
        }
      } catch (err) {
        console.error("Error fetching rooms:", err);
        setError("Failed to load rooms data. Please refresh the page.");
      }
    };

    fetchRooms();
  }, []);

  // When a room is selected, set the rent amount from the room
  useEffect(() => {
    if (selectedRoom) {
      setRentAmount(selectedRoom.rentAmount?.toString() || "0");
      // If room has a periodFrom, use it, otherwise keep current value
      if (selectedRoom.periodFrom) {
        const periodFromDate = new Date(selectedRoom.periodFrom);
        if (!isNaN(periodFromDate.getTime())) {
          setPeriodFrom(periodFromDate.toISOString().split("T")[0]);
        }
      }
    } else {
      setRentAmount("");
    }
  }, [selectedRoom]);

  // Fetch tenants when a room is selected
  useEffect(() => {
    const fetchTenants = async () => {
      if (!selectedRoom) {
        setTenants([]);
        return;
      }

      setLoading(true);
      try {
        const response = await fetch(`/api/rooms/${selectedRoom.id}/tenants`);
        if (response.ok) {
          const data = await response.json();
          setTenants(data);
        } else {
          throw new Error("Failed to fetch tenants for this room");
        }
      } catch (err) {
        console.error("Error fetching tenants:", err);
        setError("Failed to load tenants data. Please try again.");
      } finally {
        setLoading(false);
      }
    };

    fetchTenants();
  }, [selectedRoom]);

  // Helper function to create an empty tenant form
  function createEmptyTenantForm(): TenantFormData {
    return {
      name: "",
      fatherName: "",
      villageName: "",
      tehsil: "",
      policeStation: "",
      district: "",
      pincode: "",
      state: "",
      email: "",
      aadharNumber: "",
      phoneNumber: "",
      fatherPhoneNumber: "",
    };
  }

  // Add a new tenant form
  const addTenantForm = () => {
    setTenantForms([...tenantForms, createEmptyTenantForm()]);
  };

  // Remove a tenant form
  const removeTenantForm = (index: number) => {
    if (tenantForms.length > 1) {
      setTenantForms(tenantForms.filter((_, i) => i !== index));
    }
  };

  // Update a tenant form field
  const updateTenantForm = (index: number, field: string, value: string) => {
    const updatedForms = [...tenantForms];

    if (field === "aadharNumber") {
      // Format Aadhar number with spaces
      updatedForms[index] = {
        ...updatedForms[index],
        [field]: formatAadharNumber(value),
      };
    } else if (field === "phoneNumber" || field === "fatherPhoneNumber") {
      // Only allow digits for phone numbers, max 10 digits
      const cleanedValue = value.replace(/\D/g, "");
      if (cleanedValue.length <= 10) {
        updatedForms[index] = { ...updatedForms[index], [field]: cleanedValue };
      }
    } else if (field === "pincode") {
      // Only allow digits for pincode, max 6 digits
      const cleanedValue = value.replace(/\D/g, "");
      if (cleanedValue.length <= 6) {
        updatedForms[index] = { ...updatedForms[index], [field]: cleanedValue };
      }
    } else {
      updatedForms[index] = { ...updatedForms[index], [field]: value };
    }

    setTenantForms(updatedForms);
  };

  // Handle room selection from Autocomplete
  const handleRoomSelect = (option: Option | null) => {
    if (option) {
      // Find the full room object with rentAmount
      const room = rooms.find((r) => r.id === option.id) || null;
      setSelectedRoom(room);
    } else {
      setSelectedRoom(null);
    }
  };

  // Submit the tenant form and update room rent
  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!selectedRoom) {
      setError("Please select a room");
      return;
    }

    // Validate rent amount
    if (!rentAmount || isNaN(Number(rentAmount)) || Number(rentAmount) < 0) {
      setError("Please enter a valid rent amount");
      return;
    }

    // Validate all tenant forms
    for (let i = 0; i < tenantForms.length; i++) {
      const tenant = tenantForms[i];
      if (
        !tenant.name ||
        !tenant.fatherName ||
        !tenant.villageName ||
        !tenant.tehsil ||
        !tenant.policeStation ||
        !tenant.district ||
        !tenant.pincode ||
        !tenant.state ||
        !tenant.aadharNumber ||
        !tenant.phoneNumber ||
        !tenant.fatherPhoneNumber
      ) {
        setError(`Please fill all required fields for Tenant ${i + 1}`);
        return;
      }

      // Validate phone numbers (10 digits)
      if (!isValidPhoneNumber(tenant.phoneNumber)) {
        setError(`Phone number for Tenant ${i + 1} must be 10 digits`);
        return;
      }

      if (!isValidPhoneNumber(tenant.fatherPhoneNumber)) {
        setError(`Father's phone number for Tenant ${i + 1} must be 10 digits`);
        return;
      }

      // Validate Aadhar number (12 digits)
      if (!isValidAadharNumber(tenant.aadharNumber)) {
        setError(`Aadhar number for Tenant ${i + 1} must be 12 digits`);
        return;
      }

      // Validate pincode (6 digits)
      if (!isValidPincode(tenant.pincode)) {
        setError(`Pincode for Tenant ${i + 1} must be 6 digits`);
        return;
      }
    }

    setSubmitting(true);
    setError(null);
    setSuccess(null);

    try {
      // Ensure periodFrom is a valid date format (YYYY-MM-DD)
      const periodFromValue = periodFrom.trim();
      if (!periodFromValue || !/^\d{4}-\d{2}-\d{2}$/.test(periodFromValue)) {
        throw new Error("Invalid date format. Please use YYYY-MM-DD format.");
      }

      // First, update the room's rent amount and period
      const roomResponse = await fetch(`/api/rooms/${selectedRoom.id}`, {
        method: "PATCH",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          rentAmount: Number(rentAmount),
          periodFrom: periodFromValue,
          // periodTo is calculated on the server as periodFrom + 11 months
        }),
      });

      if (!roomResponse.ok) {
        const errorData = await roomResponse.json();
        throw new Error(errorData.error || "Failed to update room");
      }

      // Submit each tenant with unformatted Aadhar number
      const promises = tenantForms.map((tenant) => {
        // Create a copy of the tenant data with unformatted Aadhar number
        const tenantData = {
          ...tenant,
          aadharNumber: unformatAadharNumber(tenant.aadharNumber),
          roomId: selectedRoom.id,
        };

        return fetch("/api/tenants", {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
          },
          body: JSON.stringify(tenantData),
        });
      });

      const responses = await Promise.all(promises);

      // Check if all responses are successful
      const allSuccessful = responses.every((response) => response.ok);

      if (allSuccessful) {
        setSuccess("Tenants added successfully!");
        // Refresh tenants list
        if (selectedRoom) {
          const response = await fetch(`/api/rooms/${selectedRoom.id}/tenants`);
          if (response.ok) {
            const data = await response.json();
            setTenants(data);
          }
        }
        // Refresh room data to get updated info
        const roomDataResponse = await fetch(`/api/rooms/${selectedRoom.id}`);
        if (roomDataResponse.ok) {
          const updatedRoom = await roomDataResponse.json();
          setSelectedRoom(updatedRoom);
        }
        // Reset form
        setTenantForms([createEmptyTenantForm()]);
      } else {
        const errorResponse = responses.find((response) => !response.ok);
        if (errorResponse) {
          const errorData = await errorResponse.json();
          throw new Error(errorData.error || "Failed to add tenants");
        }
      }
    } catch (error: unknown) {
      console.error("Error adding tenants:", error);
      if (error instanceof Error) {
        setError(error.message || "Failed to add tenants. Please try again.");
      } else {
        setError("Failed to add tenants. Please try again.");
      }
    } finally {
      setSubmitting(false);
    }
  };

  // Add these functions to implement validation and formatting

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

  return (
    <div className="container mx-auto p-4 max-w-7xl">
      <h1 className="text-3xl font-bold mb-8">Tenant Management</h1>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        {/* Form Section */}
        <div className="lg:col-span-2">
          <div className="bg-white p-6 rounded-lg shadow-md">
            <h2 className="text-xl font-semibold mb-6">Add New Tenants</h2>

            <form onSubmit={handleSubmit}>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-6">
                <Autocomplete
                  options={rooms}
                  value={selectedRoom}
                  onChange={handleRoomSelect}
                  label="Room Number"
                  required
                  placeholder="Select a room..."
                />

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Rent Amount (₹) <span className="text-red-500">*</span>
                  </label>
                  <input
                    type="number"
                    className="w-full p-2 border rounded-md"
                    value={rentAmount}
                    onChange={(e) => setRentAmount(e.target.value)}
                    min="1"
                    required
                  />
                </div>
              </div>

              <div className="mb-6">
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Period From <span className="text-red-500">*</span>
                </label>
                <input
                  type="date"
                  className="w-full p-2 border rounded-md"
                  value={periodFrom}
                  onChange={(e) => setPeriodFrom(e.target.value)}
                  required
                />
                <p className="text-sm text-gray-500 mt-1">
                  Period To:{" "}
                  {periodFrom
                    ? formatDate(addMonths(new Date(periodFrom), 11))
                    : "N/A"}
                </p>
              </div>

              {tenantForms.map((tenantForm, index) => (
                <div key={index} className="border rounded-md p-4 mb-6">
                  <div className="flex justify-between items-center mb-4">
                    <h3 className="text-lg font-medium">Tenant {index + 1}</h3>
                    {tenantForms.length > 1 && (
                      <button
                        type="button"
                        onClick={() => removeTenantForm(index)}
                        className="text-red-500 hover:text-red-700"
                      >
                        Remove
                      </button>
                    )}
                  </div>

                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    {/* Tenant Name */}
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">
                        Tenant Name <span className="text-red-500">*</span>
                      </label>
                      <input
                        type="text"
                        className="w-full p-2 border rounded-md"
                        value={tenantForm.name}
                        onChange={(e) =>
                          updateTenantForm(index, "name", e.target.value)
                        }
                        required
                      />
                    </div>

                    {/* Father's Name */}
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">
                        Father&apos;s Name{" "}
                        <span className="text-red-500">*</span>
                      </label>
                      <input
                        type="text"
                        className="w-full p-2 border rounded-md"
                        value={tenantForm.fatherName}
                        onChange={(e) =>
                          updateTenantForm(index, "fatherName", e.target.value)
                        }
                        required
                      />
                    </div>

                    {/* Village Name (was Gram) */}
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">
                        Village Name <span className="text-red-500">*</span>
                      </label>
                      <input
                        type="text"
                        className="w-full p-2 border rounded-md"
                        value={tenantForm.villageName}
                        onChange={(e) =>
                          updateTenantForm(index, "villageName", e.target.value)
                        }
                        required
                      />
                    </div>

                    {/* Tehsil (was Tehseel) */}
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">
                        Tehsil <span className="text-red-500">*</span>
                      </label>
                      <input
                        type="text"
                        className="w-full p-2 border rounded-md"
                        value={tenantForm.tehsil}
                        onChange={(e) =>
                          updateTenantForm(index, "tehsil", e.target.value)
                        }
                        required
                      />
                    </div>

                    {/* Police Station (was Thana) */}
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">
                        Police Station <span className="text-red-500">*</span>
                      </label>
                      <input
                        type="text"
                        className="w-full p-2 border rounded-md"
                        value={tenantForm.policeStation}
                        onChange={(e) =>
                          updateTenantForm(
                            index,
                            "policeStation",
                            e.target.value
                          )
                        }
                        required
                      />
                    </div>

                    {/* District (was Jila) */}
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">
                        District <span className="text-red-500">*</span>
                      </label>
                      <input
                        type="text"
                        className="w-full p-2 border rounded-md"
                        value={tenantForm.district}
                        onChange={(e) =>
                          updateTenantForm(index, "district", e.target.value)
                        }
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
                        className="w-full p-2 border rounded-md"
                        value={tenantForm.pincode}
                        onChange={(e) =>
                          updateTenantForm(index, "pincode", e.target.value)
                        }
                        required
                      />
                    </div>

                    {/* State */}
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">
                        State <span className="text-red-500">*</span>
                      </label>
                      <input
                        type="text"
                        className="w-full p-2 border rounded-md"
                        value={tenantForm.state}
                        onChange={(e) =>
                          updateTenantForm(index, "state", e.target.value)
                        }
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
                        className="w-full p-2 border rounded-md"
                        value={tenantForm.email}
                        onChange={(e) =>
                          updateTenantForm(index, "email", e.target.value)
                        }
                      />
                    </div>

                    {/* Aadhar Number */}
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">
                        Aadhar Number <span className="text-red-500">*</span>
                      </label>
                      <input
                        type="text"
                        className="w-full p-2 border rounded-md"
                        value={tenantForm.aadharNumber}
                        onChange={(e) =>
                          updateTenantForm(
                            index,
                            "aadharNumber",
                            e.target.value
                          )
                        }
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
                        className="w-full p-2 border rounded-md"
                        value={tenantForm.phoneNumber}
                        onChange={(e) =>
                          updateTenantForm(index, "phoneNumber", e.target.value)
                        }
                        required
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
                        className="w-full p-2 border rounded-md"
                        value={tenantForm.fatherPhoneNumber}
                        onChange={(e) =>
                          updateTenantForm(
                            index,
                            "fatherPhoneNumber",
                            e.target.value
                          )
                        }
                        required
                      />
                    </div>
                  </div>
                </div>
              ))}

              <div className="flex justify-between mb-6">
                <button
                  type="button"
                  onClick={addTenantForm}
                  className="px-4 py-2 bg-gray-200 text-gray-800 rounded-md hover:bg-gray-300"
                >
                  Add Another Tenant
                </button>

                <button
                  type="submit"
                  disabled={submitting}
                  className="px-6 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 disabled:opacity-50"
                >
                  {submitting ? "Submitting..." : "Submit"}
                </button>
              </div>

              {error && (
                <div className="bg-red-100 text-red-700 p-3 rounded-md mb-4">
                  {error}
                </div>
              )}

              {success && (
                <div className="bg-green-100 text-green-700 p-3 rounded-md mb-4">
                  {success}
                </div>
              )}
            </form>
          </div>
        </div>

        {/* Current Tenants Section */}
        <div>
          <div className="bg-white p-6 rounded-lg shadow-md">
            <h2 className="text-xl font-semibold mb-6">
              {selectedRoom
                ? `Tenants in ${selectedRoom.name}`
                : "Select a Room"}
            </h2>

            {selectedRoom && (
              <>
                <p className="mb-2 font-medium">
                  Room Rent: ₹{selectedRoom.rentAmount?.toString() || "0"}
                </p>
                <p className="mb-4 text-sm text-gray-600">
                  Period:{" "}
                  {selectedRoom.periodFrom
                    ? formatDate(new Date(selectedRoom.periodFrom))
                    : "N/A"}{" "}
                  to{" "}
                  {selectedRoom.periodTo
                    ? formatDate(new Date(selectedRoom.periodTo))
                    : "N/A"}
                </p>
              </>
            )}

            {loading ? (
              <p className="text-gray-500">Loading tenants...</p>
            ) : selectedRoom && tenants.length === 0 ? (
              <p className="text-gray-500">No tenants found in this room.</p>
            ) : !selectedRoom ? (
              <p className="text-gray-500">
                Please select a room to view its tenants.
              </p>
            ) : (
              <div className="space-y-6">
                {tenants.map((tenant) => (
                  <div key={tenant.id} className="border rounded-md p-4">
                    <h3 className="font-medium mb-2">{tenant.name}</h3>
                    <div className="text-sm text-gray-600 space-y-1">
                      <p>Father: {tenant.fatherName}</p>
                      <p>
                        Address: {tenant.villageName}, {tenant.tehsil},{" "}
                        {tenant.policeStation}, {tenant.district},{" "}
                        {tenant.state} - {tenant.pincode}
                      </p>
                      <p>Phone: {tenant.phoneNumber}</p>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
