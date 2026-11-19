/** Vercel Cron and the hourly GitHub workflow send `Authorization: Bearer <CRON_SECRET>`. */
export function authorizeCron(request: Request) {
  const secret = process.env.CRON_SECRET;
  return Boolean(secret) && request.headers.get("authorization") === `Bearer ${secret}`;
}
