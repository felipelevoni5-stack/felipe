import type { NextFunction, Request, Response } from "express";

type AsyncRouteHandler = (req: Request, res: Response) => Promise<unknown>;

// Express 4 não captura rejeições de Promise automaticamente; este wrapper garante
// que qualquer erro assíncrono caia no errorHandler central em vez de travar o processo.
export function asyncHandler(handler: AsyncRouteHandler) {
  return (req: Request, res: Response, next: NextFunction) => {
    handler(req, res).catch(next);
  };
}
