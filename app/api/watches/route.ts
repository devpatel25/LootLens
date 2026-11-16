/* eslint-disable @typescript-eslint/no-unused-vars -- typed stub */
const nope = (..._args: unknown[]) => Response.json({ error: { code: "not_implemented", message: "stub" } }, { status: 501 });
export const GET = nope;
export const POST = nope;
