# Docker Setup for LotLogic Frontend

This document provides instructions for building and running the LotLogic Frontend application using Docker.

## Prerequisites

- Docker installed on your system
- Docker Compose (usually comes with Docker Desktop)

## Quick Start


### Development Build

1. **Build and run the development container:**
   ```bash
   docker-compose up --build
   ```

2. **Access the development application:**
   - Open your browser and navigate to `http://localhost:3001`

## Manual Docker Commands

### Development

```bash
# Build the development image
docker build -f Dockerfile.dev -t lotlogic-fe-dev .

# Run the development container
docker run -p 3001:3000 -v $(pwd):/app lotlogic-fe-dev
```

## Docker Compose Services

### Development Service (`lotlogic-fe-dev`)
- **Port:** 3001
- **Environment:** Development
- **Features:** Hot reloading, volume mounting, development server

## Environment Variables

The following environment variables are automatically set:

- `NODE_ENV=production` (production) or `NODE_ENV=development` (development)
- `NEXT_TELEMETRY_DISABLED=1`
- `HOSTNAME=0.0.0.0`

## Health Check

The production container includes a health check that monitors the application at `/api/health`. The health check:

- Runs every 30 seconds
- Times out after 10 seconds
- Retries 3 times before marking as unhealthy
- Starts after 40 seconds of container startup

## Troubleshooting

### Build Issues

1. **Clear Docker cache:**
   ```bash
   docker system prune -a
   ```

2. **Rebuild without cache:**
   ```bash
   docker-compose build --no-cache
   ```

### Port Conflicts

If port 3000 is already in use:

1. **Change the port mapping in docker-compose.yml:**
   ```yaml
   ports:
     - "3001:3000"  # Use port 3001 instead
   ```

2. **Or stop the conflicting service:**
   ```bash
   # Find what's using port 3000
   lsof -i :3000
   
   # Stop the service
   kill -9 <PID>
   ```

### Permission Issues

If you encounter permission issues:

1. **Run with sudo (Linux/macOS):**
   ```bash
   sudo docker-compose up --build
   ```

2. **Add your user to the docker group:**
   ```bash
   sudo usermod -aG docker $USER
   # Log out and log back in
   ```