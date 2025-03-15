# Brothers Lodge PostgreSQL Docker Setup

This repository contains a Docker setup for a PostgreSQL database instance running on port 5434 externally (mapped to internal port 5433) to avoid conflicts with existing PostgreSQL installations.

## Getting Started

### Starting the PostgreSQL Server

```bash
# Build and start the PostgreSQL container
docker-compose up -d

# Check if the container is running
docker-compose ps
```

### Connecting with Prisma

To connect to this PostgreSQL instance using Prisma, use the following connection string in your `.env` file:

```
DATABASE_URL="postgresql://postgres:postgres@localhost:5434/brothers_lodge?schema=public"
```

Then initialize Prisma in your project:

```bash
# Install Prisma CLI if you haven't already
npm install prisma --save-dev

# Initialize Prisma
npx prisma init

# Generate Prisma client after modifying your schema
npx prisma generate

# Run migrations when ready
npx prisma migrate dev
```

### Stopping the PostgreSQL Server

```bash
docker-compose down
```

To remove all data and start fresh:

```bash
docker-compose down -v
```

## Environment Variables

The PostgreSQL server uses the following default credentials:

- **Port**: 5434 (external), 5433 (internal)
- **User**: postgres
- **Password**: postgres
- **Database**: brothers_lodge

You can modify these in the `docker-compose.yml` file if needed, but remember to update your Prisma connection string accordingly.
