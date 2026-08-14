export function generateOrderNumber(): string {
  const now = new Date();

  const year = now.getFullYear();
  const month = String(now.getMonth() + 1).padStart(2, "0");
  const day = String(now.getDate()).padStart(2, "0");

  const time = String(now.getHours() * 3600 + now.getMinutes() * 60 + now.getSeconds()).padStart(
    5,
    "0",
  );

  return `ORD-${year}${month}${day}-${time}`;
}
