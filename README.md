# CS2 Demo URL Retriever API

A system for retrieving CS2 demo file URLs using game share codes and the CS2 Game Coordinator.

## Setup

1. Clone the repository
2. Install dependencies
   ```
   bun install
   ```

3. Configure environment variables
   - Copy the .env.example file to .env in the demo-dl app directory
   ```
   cp apps/demo-dl/.env.example apps/demo-dl/.env
   ```
   - Edit the .env file with your Steam credentials
   ```
   STEAM_USERNAME=your_steam_username
   STEAM_PASSWORD=your_steam_password
   ```

4. Run the application
   ```
   bun turbo run start
   ```

5. Access the API:
   - API endpoint: `http://localhost:3000`
   - Swagger documentation: `http://localhost:3000/swagger`

## Docker Deployment

You can also run the application using Docker:

1. Create a `.env` file in the project root with your Steam credentials:
   ```
   STEAM_USERNAME=your_steam_username
   STEAM_PASSWORD=your_steam_password
   ```

2. Build and run using Docker Compose:
   ```
   docker compose up --build
   ```

3. The API will be available at `http://localhost:3000`
4. Swagger documentation will be available at `http://localhost:3000/swagger`

**Note**: Make sure to add `.env` to your `.gitignore` file to avoid committing sensitive credentials to version control.

## API Documentation

The API includes comprehensive interactive Swagger/OpenAPI documentation accessible at `/swagger` when the server is running. This provides:

- **Interactive Testing**: Test API endpoints directly from the browser
- **Schema Validation**: View request/response schemas and validation rules
- **Live Examples**: See real-time examples of API requests and responses
- **Parameter Documentation**: Detailed information about all endpoint parameters

### Accessing Swagger Documentation

- **Local Development**: `http://localhost:3000/swagger`
- **Docker Deployment**: `http://localhost:3000/swagger`

### Features

The Swagger documentation includes:
- Complete API schema definitions
- Share code format validation (pattern matching)
- Interactive request/response testing
- Detailed error response documentation
- Example values for all fields
- Organized endpoint categorization

## API Endpoints

### Get Demo URL
```
GET /api/:shareCode
```

Retrieves the demo download URL for a given CS2 share code.

**Parameters:**
- `shareCode` (path parameter): CS2 match share code (e.g., `CSGO-LkCOc-UwdN3-dkQBV-F9Sxz-KeS8N`)

**Example Request:**
```
GET /api/CSGO-LkCOc-UwdN3-dkQBV-F9Sxz-KeS8N
```

**Success Response (200):**
```json
{
  "success": true,
  "message": "Demo URL has been retrieved.",
  "data": {
    "sharecode": "CSGO-LkCOc-UwdN3-dkQBV-F9Sxz-KeS8N",
    "demo_url": "http://replay403.valve.net/730/003746913113794936940_1899413587.dem.bz2"
  }
}
```

**Error Response (200) - Invalid/Expired ShareCode:**
```json
{
  "success": false,
  "message": "ShareCode does not exist or has expired.",
  "data": {
    "sharecode": "CSGO-LkCOc-UwdN3-dkQBV-F9Sxz-KeS8N"
  }
}
```

**Response Time:** The API has a 500ms timeout for share code validation. If a demo URL is not found within this timeframe, an error response is returned.

**Caching:** Successfully retrieved demo URLs are cached for immediate future requests of the same share code.

## Using the Swagger Documentation

The interactive Swagger UI provides several useful features for API development and testing:

### Testing Endpoints
1. Navigate to `http://localhost:3000/swagger`
2. Click on the `GET /api/{shareCode}` endpoint
3. Click "Try it out"
4. Enter a CS2 share code in the `shareCode` parameter field
5. Click "Execute" to test the API

## Architecture

This project consists of two main components:

1. **API Server**: An Elysia server that handles HTTP requests and communicates with the CS2 client via IPC
2. **Demo Downloader**: A Node.js application that interfaces with the CS2 Game Coordinator to retrieve demo URLs

The components communicate using an IPC (Inter-Process Communication) channel via Unix domain sockets.

### Technology Stack

- **Runtime**: [Bun](https://bun.sh/) - Fast JavaScript runtime and package manager
- **API Framework**: [Elysia](https://elysiajs.com/) - Fast and friendly web framework
- **Documentation**: [Swagger/OpenAPI](https://swagger.io/) - Interactive API documentation
- **Validation**: TypeScript with schema validation
- **Steam Integration**: Steam User and Global Offensive APIs
- **Code Quality**: [ESLint](https://eslint.org/) for linting, [Prettier](https://prettier.io) for formatting
