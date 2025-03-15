import Link from "next/link";

export default function HomePage() {
  return (
    <div className="container mx-auto p-8 max-w-6xl">
      <div className="text-center mb-12">
        <h1 className="text-4xl font-bold mb-4">
          Brothers Lodge Management System
        </h1>
        <p className="text-xl text-gray-600">
          Easily manage rooms, tenants, and rental information
        </p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
        <Link href="/tenants" className="block">
          <div className="bg-white p-6 rounded-lg shadow-md hover:shadow-lg transition-shadow">
            <h2 className="text-2xl font-semibold mb-3">Tenant Management</h2>
            <p className="text-gray-600 mb-4">
              Add, update, and view tenant information for all rooms
            </p>
            <div className="flex justify-between items-center">
              <span className="text-blue-600">Manage Tenants</span>
              <span className="text-blue-600">→</span>
            </div>
          </div>
        </Link>

        <div className="bg-white p-6 rounded-lg shadow-md hover:shadow-lg transition-shadow">
          <h2 className="text-2xl font-semibold mb-3">Room Overview</h2>
          <p className="text-gray-600 mb-4">
            View all rooms and their current occupancy status
          </p>
          <div className="flex justify-between items-center">
            <span className="text-blue-600">View Rooms</span>
            <span className="text-blue-600">→</span>
          </div>
        </div>

        <div className="bg-white p-6 rounded-lg shadow-md hover:shadow-lg transition-shadow">
          <h2 className="text-2xl font-semibold mb-3">Rent Collection</h2>
          <p className="text-gray-600 mb-4">
            Track and manage rental payments from all tenants
          </p>
          <div className="flex justify-between items-center">
            <span className="text-blue-600">Collect Rent</span>
            <span className="text-blue-600">→</span>
          </div>
        </div>
      </div>
    </div>
  );
}
