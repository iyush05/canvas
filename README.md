# Canvas - Realtime Infinite Whiteboard

A collaborative, real-time infinite whiteboard application built with Next.js, WebSockets, and HTML5 Canvas.

## Features
- **Infinite Canvas**: Pan and zoom seamlessly across an infinite workspace.
- **Real-time Collaboration**: See cursors and live updates from other users in the same room.
- **Drawing Tools**: Pen, line, arrow, rectangle, and ellipse with customizable colors and stroke widths.
- **Text Tool**: Add and edit text directly on the canvas.
- **Image Uploads**: Drag and drop or browse to upload images directly to the canvas (backed by AWS S3).
- **Selection & Manipulation**: Select, move, and resize single or multiple elements (lasso selection).
- **Undo/Redo**: Operation-based undo stack that works flawlessly in multiplayer environments.

## Tech Stack
- **Frontend**: Next.js 15 (React 19), HTML5 Canvas API, Tailwind CSS v4, Zustand (state management)
- **Backend**: Node.js WebSocket Server (ws)
- **Database**: PostgreSQL with Prisma ORM
- **Storage**: AWS S3 (for image uploads)
- **Package Manager**: Bun

## Prerequisites
Before you begin, ensure you have the following installed:
- [Bun](https://bun.sh/) (Runtime & Package Manager)
- PostgreSQL (Local instance or Cloud provider like Neon/Supabase)
- AWS Account (for S3 bucket setup)

## Local Setup

### 1. Clone the repository
```bash
git clone <your-repo-url>
cd canvas
```

### 2. Install dependencies
```bash
bun install
```

### 3. Environment Variables
Create a `.env` file in the root directory and add the following variables. You can use `.env.example` as a reference if available.

```env
# Database
DATABASE_URL="postgresql://user:password@localhost:5432/canvas"

# WebSocket server
NEXT_PUBLIC_WS_URL="ws://localhost:3001"
NEXT_PUBLIC_APP_URL="http://localhost:3000"

# AWS S3 (Required for image uploads)
AWS_REGION="us-east-1"
AWS_ACCESS_KEY_ID="your_access_key"
AWS_SECRET_ACCESS_KEY="your_secret_key"
AWS_S3_BUCKET="your_bucket_name"
```
*Note: Make sure your S3 bucket has a CORS policy configured to allow uploads and reads from your localhost/production domain.*

### 4. Database Setup
Push the Prisma schema to your PostgreSQL database to create the necessary tables:
```bash
bunx prisma db push
```

### 5. Running the Application
You need to run two processes simultaneously: the Next.js frontend/API and the WebSocket server.

**Terminal 1 (Next.js App):**
```bash
bun dev
```

**Terminal 2 (WebSocket Server):**
```bash
bunx tsx server/ws-server.ts
```

The application will be available at `http://localhost:3000`.

## Deployment

To deploy this application to production, you'll need to host the components separately:
1. **Next.js App**: Deploy to Vercel.
2. **WebSocket Server**: Deploy to a persistent hosting service like Railway, Render, or Fly.io (Vercel Serverless Functions do not support long-lived WebSocket connections).
3. **Database**: Use a managed PostgreSQL service like Neon.

Make sure to update the `NEXT_PUBLIC_WS_URL` and `NEXT_PUBLIC_APP_URL` environment variables in your production environments to point to the respective deployed services.
