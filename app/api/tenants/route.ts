import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { Prisma } from "@prisma/client";

// GET /api/tenants - Get all tenants with their rooms
export async function GET() {
  try {
    const tenants = await prisma.tenant.findMany({
      include: {
        room: true,
      },
      orderBy: {
        createdAt: "desc",
      },
    });
    return NextResponse.json(tenants);
  } catch (error) {
    console.error("Error fetching tenants:", error);
    return NextResponse.json(
      { error: "Failed to fetch tenants" },
      { status: 500 }
    );
  }
}

// POST /api/tenants - Create a new tenant
export async function POST(request: NextRequest) {
  try {
    const body = await request.json();

    // Ensure periodFrom is a valid date by adding time component
    // Convert date string (YYYY-MM-DD) to a full ISO date
    const periodFromDate = new Date(body.periodFrom);

    // Check if the date is valid
    if (isNaN(periodFromDate.getTime())) {
      return NextResponse.json(
        { error: "Invalid date format for periodFrom" },
        { status: 400 }
      );
    }

    // Calculate periodTo date (11 months from periodFrom)
    const periodToDate = new Date(periodFromDate);
    periodToDate.setMonth(periodToDate.getMonth() + 11);

    // Create tenant with the calculated periodTo
    const tenant = await prisma.tenant.create({
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
        periodFrom: periodFromDate,
        periodTo: periodToDate,
        roomId: Number(body.roomId),
      },
      include: {
        room: true,
      },
    });

    return NextResponse.json(tenant, { status: 201 });
  } catch (error) {
    console.error("Error creating tenant:", error);

    if (error instanceof Prisma.PrismaClientKnownRequestError) {
      if (error.code === "P2002") {
        return NextResponse.json(
          { error: "A tenant with this information already exists" },
          { status: 409 }
        );
      }

      if (error.code === "P2003") {
        return NextResponse.json(
          { error: "The specified room does not exist" },
          { status: 400 }
        );
      }
    }

    return NextResponse.json(
      {
        error:
          "Failed to create tenant: " +
          (error instanceof Error ? error.message : "Unknown error"),
      },
      { status: 500 }
    );
  }
}
