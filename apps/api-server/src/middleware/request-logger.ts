import type { MiddlewareHandler } from "hono";
import { logger } from "../lib/logger";

export const requestLogger: MiddlewareHandler = async (c, next) => {
  const start = Date.now();
  const method = c.req.method;
  const path = c.req.path;
  const visitorId = c.req.header("X-Visitor-Id");

  await next();

  const duration = Date.now() - start;
  const status = c.res.status;

  logger.info(
    {
      method,
      path,
      status,
      duration,
      visitorId,
    },
    `${method} ${path} ${String(status)} ${String(duration)}ms`
  );
};
