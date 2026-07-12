import express from "express";
import cors from "cors";
import helmet from "helmet";
import compression from "compression";
import dotenv from "dotenv";
import morgan from "morgan";
import axios from "axios";
import axiosClient from "./utils/axiosClient";
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

// Health check endpoint for deployment platforms (Render, Railway, Koyeb, etc.)
// Registered first to execute immediately and bypass router middlewares checks
app.get("/healthz", (_req, res) => {
    res.status(200).json({
        success: true,
        status: "OK",
        service: "AnimOrg Backend",
        version: "1.1.0",
        timestamp: new Date().toISOString()
    });
});

app.get("/debug/jikan", async (_req, res) => {
    const configTimeout = 10000;
    const results: any = {
        nodeVersion: process.version,
    };

    console.log("=== /debug/jikan CONNECTIVITY TRACE ===");
    console.log(`- Node Version: ${process.version}`);
    console.log(`- axiosClient.defaults.timeout: ${axiosClient.defaults.timeout}`);

    // 1. axiosClient Test
    try {
        const start = Date.now();
        console.log(`- Requesting via axiosClient: GET https://api.jikan.moe/v4/anime/21/full. Config duration limit: ${axiosClient.defaults.timeout}`);
        const response = await axiosClient.get("https://api.jikan.moe/v4/anime/21/full");
        const duration = Date.now() - start;
        results.axiosClient = {
            success: true,
            timeout: axiosClient.defaults.timeout,
            status: response.status,
            duration,
            error: null,
            dataPreview: JSON.stringify(response.data).substring(0, 200)
        };
        console.log(`- axiosClient SUCCESS: status ${response.status} in ${duration}ms`);
    } catch (error: any) {
        console.error("- axiosClient FAILED:", error.message || error);
        results.axiosClient = {
            success: false,
            timeout: error.config?.timeout || axiosClient.defaults.timeout,
            status: error.response?.status || "N/A",
            duration: 0,
            error: error.message || "N/A",
            dataPreview: "N/A"
        };
    }

    // 2. plain axios Test
    try {
        const start = Date.now();
        console.log(`- Requesting via raw axios: GET https://api.jikan.moe/v4/anime/21/full. Config timeout limit: ${configTimeout}`);
        const response = await axios.get("https://api.jikan.moe/v4/anime/21/full", {
            timeout: configTimeout
        });
        const duration = Date.now() - start;
        results.plainAxios = {
            success: true,
            timeout: configTimeout,
            status: response.status,
            duration,
            error: null,
            dataPreview: JSON.stringify(response.data).substring(0, 200)
        };
        console.log(`- raw axios SUCCESS: status ${response.status} in ${duration}ms`);
    } catch (error: any) {
        console.error("- raw axios FAILED:", error.message || error);
        results.plainAxios = {
            success: false,
            timeout: error.config?.timeout || configTimeout,
            status: error.response?.status || "N/A",
            duration: 0,
            error: error.message || "N/A",
            dataPreview: "N/A"
        };
    }
    console.log("=======================================");

    res.json(results);
});

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