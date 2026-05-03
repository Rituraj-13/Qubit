import type { NextFunction, Request, Response } from "express";
import { createSupabaseClient } from "../client";
import { prisma } from "../db";

const client = createSupabaseClient();

export async function Middleware(req: Request, res: Response, next: NextFunction) {
    const token = req.headers.authorization;

    const data = await client.auth.getUser(token)
    const userId = data.data.user?.id;
    if (userId) {
        try {
            // Creating a 2-way sync with the supabase auth table and ours native database user table
            // Using Prisma upsert func to either create (if not available) or else simply update the existing fields of the database, which helps to perevent the unique constraint related errors
            await prisma.user.upsert({
                where: {
                    id: data.data.user!.id,
                },
                create: {
                    id: data.data.user!.id,
                    supabaseId: data.data.user!.id,
                    email: data.data.user!.email!,
                    name: data.data.user?.user_metadata?.full_name
                        ?? data.data.user!.email!
                        ?? "Unknown",
                    provider: data.data.user?.app_metadata?.provider === "google" ? "Google" : "Github",
                },
                update: {
                    email: data.data.user!.email!,
                    name: data.data.user?.user_metadata?.full_name
                        ?? data.data.user!.email!
                        ?? "Unknown",
                    provider: data.data.user?.app_metadata?.provider === "google" ? "Google" : "Github",
                },
            })
        } catch (error) {
            console.log("Error: ", error);
        }
        req.userId = userId;
        next();
    } else {
        res.status(403).json({
            "message": "Incorrect Inputs"
        })
    }
}