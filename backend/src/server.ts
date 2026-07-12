import express from "express";
import cors from "cors";
import helmet from "helmet";
import compression from "compression";
import dotenv from "dotenv";
import morgan from "morgan";
import animeRoutes from "./routes/animeRoutes";
import homeRoutes from "./routes/homeRoutes";
import { errorHandler } from "./middleware/errorHandler";

dotenv.config();

const app = express();

// Register global middlewares
app.use(cors());
app.use(helmet());
app.use(compression());
app.use(express.json());
app.use(morgan("dev"));

// Register route handlers
app.use("/api/anime", animeRoutes);
app.use("/api/home", homeRoutes);

// Root health check endpoint
app.get("/", (req, res) => {
    res.json({
        success: true,
        status: "AnimOrg Backend Running",
        version: "1.1.0",
        environment: process.env.NODE_ENV,
    });
});

// Centralized error handling middleware (must be registered last)
app.use(errorHandler);

const PORT = process.env.PORT || 5000;

app.listen(PORT, () => {
    console.log(`🚀 AnimOrg Backend running on port ${PORT}`);
});
export default app;