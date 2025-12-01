# Sapthagiri NPS University - Backend API

Backend API for the Sapthagiri NPS University Management System.

## Deployment on Vercel

### Required Environment Variables

You need to configure the following environment variables in your Vercel project settings:

1. Go to [Vercel Dashboard](https://vercel.com/dashboard)
2. Select your `snpsubknd` project
3. Go to **Settings** → **Environment Variables**
4. Add the following variables:

| Variable | Description | Example |
|----------|-------------|---------|
| `MONGO_URI` | MongoDB connection string | `mongodb+srv://username:password@cluster.mongodb.net/dbname` |
| `JWT_SECRET` | Secret key for JWT tokens | Any random secure string |
| `PORT` | Port number (optional) | `5000` |
| `NODE_ENV` | Environment mode | `production` |

### After Adding Environment Variables

1. Go to the **Deployments** tab
2. Click on the three dots (...) next to the latest deployment
3. Select **Redeploy**

## Local Development

1. Create a `.env` file in the backend directory:
```env
MONGO_URI=your_mongodb_connection_string
JWT_SECRET=your_jwt_secret
PORT=5000
NODE_ENV=development
```

2. Install dependencies:
```bash
npm install
```

3. Run the development server:
```bash
npm run dev
```

## API Endpoints

- `GET /` - Health check
- `GET /api` - API health check
- `POST /api/auth/login` - User login
- `POST /api/auth/register` - User registration
- `GET /api/auth/me` - Get current user
- And more...

## Tech Stack

- **Node.js** - Runtime environment
- **Express** - Web framework
- **MongoDB** - Database
- **Mongoose** - ODM
- **JWT** - Authentication
- **bcryptjs** - Password hashing
