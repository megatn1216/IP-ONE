function maskSegment(seg){
  const s = String(seg ?? "");
  if (!s) return "";
  return "X".repeat(s.length);
}

/**
 * 마스킹 규칙
 * - 첫번째, 세번째 옥텟을 X로 마스킹
 * - 예) 10.81.123.152 -> XX.81.XXX.152
 */
export function maskIp(ip){
  if (!ip) return "";
  const parts = String(ip).split(".");
  if (parts.length !== 4) return ip;

  const [a, b, c, d] = parts;
  const maskedA = maskSegment(a);
  const maskedC = maskSegment(c);

  return `${maskedA}.${b}.${maskedC}.${d}`;
}

/**
 * IP 정렬용 튜플
 */
export function ipToTuple(ip){
  const parts = String(ip ?? "").split(".");
  if (parts.length !== 4) return [Infinity, Infinity, Infinity, Infinity];
  return parts.map(p => {
    const n = Number(p);
    return Number.isFinite(n) ? n : Infinity;
  });
}
