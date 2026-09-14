import cookieParser from "cookie-parser";
import cors from "cors";
import express, { Application, Request, Response } from "express";
import swaggerUi from "swagger-ui-express";
import config from "./config";
import { swaggerDocument } from "./docs/swagger";
import globalErrorHandler from "./middlewares/globalErrorHandler";
import notFound from "./middlewares/notFound";
import router from "./routes";

const app: Application = express();

// Middlewares & Security Parsers
app.use(
  cors({
    origin: [
      config.client_url,
      "https://www.teloscart.website",
      "http://localhost:5173",
      "http://localhost:3000",
    ],
    credentials: true,
  }),
);
app.use(cookieParser());
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// Interactive Swagger API Documentation
app.use("/api/v1/docs", swaggerUi.serve, swaggerUi.setup(swaggerDocument));
app.use("/docs", swaggerUi.serve, swaggerUi.setup(swaggerDocument));

// Root Endpoint
app.get("/", (req: Request, res: Response) => {
  res.status(200).json({
    success: true,
    message: "Welcome to TelosCart E-Commerce API Server",
    website: "https://www.teloscart.website/",
    version: "1.0.0",
    docs: "/api/v1/docs",
    health: "/api/v1/health",
  });
});

// Master Application Routes
app.use("/api/v1", router);

// Error Handling Middleware Pipeline
app.use(globalErrorHandler);

// Not Found Handler
app.use(notFound);

export default app;
