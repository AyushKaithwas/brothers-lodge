import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { Prisma } from "@prisma/client";

// GET /api/tenants/[id] - Get a specific tenant
export async function GET(
  req: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const tenantId = parseInt((await params).id);

    if (isNaN(tenantId)) {
      return NextResponse.json({ error: "Invalid tenant ID" }, { status: 400 });
    }

    const tenant = await prisma.tenant.findUnique({
      where: { id: tenantId },
      include: {
        room: true,
      },
    });

    if (!tenant) {
      return NextResponse.json({ error: "Tenant not found" }, { status: 404 });
    }

    return NextResponse.json(tenant);
  } catch (error) {
    console.error("Error fetching tenant:", error);
    return NextResponse.json(
      { error: "Failed to fetch tenant" },
      { status: 500 }
    );
  }
}

// PATCH /api/tenants/[id] - Update a tenant
export async function PATCH(
  req: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const tenantId = parseInt((await params).id);

    if (isNaN(tenantId)) {
      return NextResponse.json({ error: "Invalid tenant ID" }, { status: 400 });
    }

    const body = await req.json();

    // Validate required fields
    const requiredFields = [
      "name",
      "fatherName",
      "villageName",
      "tehsil",
      "policeStation",
      "district",
      "pincode",
      "state",
      "phoneNumber",
      "fatherPhoneNumber",
      "aadharNumber",
    ];

    for (const field of requiredFields) {
      if (!body[field]) {
        return NextResponse.json(
          {
            error: `Field '${field}' is required`,
          },
          { status: 400 }
        );
      }
    }

    // Validate phone numbers (10 digits)
    const phoneNumberFields = ["phoneNumber", "fatherPhoneNumber"];
    for (const field of phoneNumberFields) {
      if (body[field] && !/^\d{10}$/.test(body[field])) {
        return NextResponse.json(
          {
            error: `${field} must be 10 digits`,
          },
          { status: 400 }
        );
      }
    }

    // Validate aadhar number (12 digits)
    if (body.aadharNumber && !/^\d{12}$/.test(body.aadharNumber)) {
      return NextResponse.json(
        {
          error: "Aadhar number must be 12 digits",
        },
        { status: 400 }
      );
    }

    // Validate pincode (6 digits)
    if (body.pincode && !/^\d{6}$/.test(body.pincode)) {
      return NextResponse.json(
        {
          error: "Pincode must be 6 digits",
        },
        { status: 400 }
      );
    }

    // Check if tenant exists
    const existingTenant = await prisma.tenant.findUnique({
      where: { id: tenantId },
    });

    if (!existingTenant) {
      return NextResponse.json({ error: "Tenant not found" }, { status: 404 });
    }

    // Update the tenant
    const updatedTenant = await prisma.tenant.update({
      where: { id: tenantId },
      data: {
        name: body.name,
        fatherName: body.fatherName,
        villageName: body.villageName,
        tehsil: body.tehsil,
        policeStation: body.policeStation,
        district: body.district,
        pincode: body.pincode,
        state: body.state,
        email: body.email,
        aadharNumber: body.aadharNumber,
        phoneNumber: body.phoneNumber,
        fatherPhoneNumber: body.fatherPhoneNumber,
      },
      include: {
        room: true,
      },
    });

    return NextResponse.json(updatedTenant);
  } catch (error) {
    console.error("Error updating tenant:", error);

    if (error instanceof Prisma.PrismaClientKnownRequestError) {
      if (error.code === "P2002") {
        return NextResponse.json(
          { error: "A tenant with this information already exists" },
          { status: 409 }
        );
      }
    }

    return NextResponse.json(
      { error: "Failed to update tenant" },
      { status: 500 }
    );
  }
}

// DELETE /api/tenants/[id] - Delete a tenant
export async function DELETE(
  req: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const tenantId = parseInt((await params).id);

    if (isNaN(tenantId)) {
      return NextResponse.json({ error: "Invalid tenant ID" }, { status: 400 });
    }

    // Check if tenant exists
    const existingTenant = await prisma.tenant.findUnique({
      where: { id: tenantId },
    });

    if (!existingTenant) {
      return NextResponse.json({ error: "Tenant not found" }, { status: 404 });
    }

    // Delete the tenant
    await prisma.tenant.delete({
      where: { id: tenantId },
    });

    return NextResponse.json({ message: "Tenant deleted successfully" });
  } catch (error) {
    console.error("Error deleting tenant:", error);
    return NextResponse.json(
      { error: "Failed to delete tenant" },
      { status: 500 }
    );
  }
}
