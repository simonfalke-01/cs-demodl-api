# CS:GO Demo Downloader API

A system for retrieving CS:GO demo files using the CS:GO Game Coordinator.

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

## API Endpoints

### Get Demo URL
```
GET /api/:shareCode
```

Retrieves the demo URL for a given CS:GO share code.

Example:
```
GET /api/CSGO-LkCOc-UwdN3-dkQBV-F9Sxz-KeS8N
```

Response:
```json
{
  "shareCode": "CSGO-LkCOc-UwdN3-dkQBV-F9Sxz-KeS8N",
  "demoURL": "http://replay403.valve.net/730/003746913113794936940_1899413587.dem.bz2"
}
```

## Architecture

This project consists of two main components:

1. **API Server**: An Elysia server that handles HTTP requests and communicates with the CS:GO client
2. **Demo Downloader**: A Node.js application that interfaces with the CS:GO Game Coordinator to retrieve demo URLs

The components communicate using an IPC (Inter-Process Communication) channel.
- [ESLint](https://eslint.org/) for code linting
- [Prettier](https://prettier.io) for code formatting
