import express from "express";
import fs from "fs";
import path from "path";
import crypto from "crypto";
import { fileURLToPath } from "url";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const app = express();
const PORT = Number(process.env.PORT || 7777);

// In-memory session store (simple)
const sessions = new Map();

// -----------------------------
// IP-BOOK 데이터: JSON 파일을 “DB처럼” 사용
// -----------------------------
const IP_DATA_PATH = path.join(__dirname, "ipbook-data.json");

// ✅ filterSample.json 경로 & 캐시
const FILTER_SAMPLE_PATH = path.join(__dirname, "filterSample.json");
let filterSampleCache = null;

function loadFilterSampleJson() {
  if (filterSampleCache) return filterSampleCache;

  try {
    const raw = fs.readFileSync(FILTER_SAMPLE_PATH, "utf-8");
    filterSampleCache = JSON.parse(raw);
    console.log("[WAS] filterSample.json 로딩 완료");
  } catch (err) {
    console.error("[WAS] filterSample.json 로딩 실패:", err.message);
    filterSampleCache = null;
  }
  return filterSampleCache;
}

// 메모리에 유지할 IP 데이터 (무조건 "새 포맷"으로만 저장)
let ipRows = [];

// -----------------------------
// 날짜 유틸 (KST 기준)
// -----------------------------

// KST 기준 시간 문자열: YYYY-MM-DDTHH:mm:ss
function nowKstString() {
  const now = new Date();
  const utc = now.getTime();
  const kst = new Date(utc + 9 * 60 * 60 * 1000); // UTC +9

  const pad = (n) => String(n).padStart(2, "0");

  const yyyy = kst.getFullYear();
  const mm = pad(kst.getMonth() + 1);
  const dd = pad(kst.getDate());
  const hh = pad(kst.getHours());
  const mi = pad(kst.getMinutes());
  const ss = pad(kst.getSeconds());

  return `${yyyy}-${mm}-${dd}T${hh}:${mi}:${ss}`;
}

function nowIso() {
  // API 응답 timestamp 용 (UTC 그대로 사용)
  return new Date().toISOString();
}

// 기존 문자열을 우리 포맷으로 정규화
function normalizeKstDateString(v) {
  if (!v) return v;
  const s = String(v);

  // ISO(밀리초/Z) 형태면 한 번만 변환
  if (s.endsWith("Z") || s.includes(".")) {
    const d = new Date(s);
    if (Number.isNaN(d.getTime())) return s;

    const utc = d.getTime();
    const kst = new Date(utc + 9 * 60 * 60 * 1000);
    const pad = (n) => String(n).padStart(2, "0");

    const yyyy = kst.getFullYear();
    const mm = pad(kst.getMonth() + 1);
    const dd = pad(kst.getDate());
    const hh = pad(kst.getHours());
    const mi = pad(kst.getMinutes());
    const ss = pad(kst.getSeconds());

    return `${yyyy}-${mm}-${dd}T${hh}:${mi}:${ss}`;
  }

  // 이미 "YYYY-MM-DDTHH:mm:ss" 비슷하면 그대로 둠
  return s;
}

function normalizeAssetTypeLabel(v) {
  const s = String(v ?? "").trim();
  if (!s) return "";
  if (s === "NETWORK" || s === "network" || s === "네트워크") return "네트워크";
  if (s === "SERVER" || s === "server" || s === "서버") return "서버";
  return s;
}

/**
 * 파일에서 읽은 raw row를
 * - 이미 새 포맷이면 그대로(단, 날짜/자산유형 포맷은 정규화)
 * - 옛 포맷이면 새 포맷으로 변환
 */
function normalizeRowFromFile(raw) {
  if (!raw || typeof raw !== "object") return null;

  // 이미 새 포맷인 경우
  if (
      Object.prototype.hasOwnProperty.call(raw, "ipAddress") ||
      Object.prototype.hasOwnProperty.call(raw, "netCategory") ||
      Object.prototype.hasOwnProperty.call(raw, "netType")
  ) {
    const hasId = raw.id != null && raw.id !== "";
    const created = normalizeKstDateString(raw.createDt || raw.createdAt);
    const updated = normalizeKstDateString(
        raw.updateDt || raw.updatedAt || raw.createDt || raw.createdAt
    );

    return {
      ...raw,
      id:
          hasId
              ? raw.id
              : crypto.randomUUID
                  ? crypto.randomUUID()
                  : crypto.randomBytes(16).toString("hex"),
      assetType: normalizeAssetTypeLabel(raw.assetType),
      createDt: created,
      updateDt: updated || created,
    };
  }

  // ---- 여기부터는 "옛 포맷" → "새 포맷" 매핑 ----
  const now = nowKstString();

  const {
    id,
    // IP / 망 계열
    ip,
    netAttr,
    netType1,
    netType2,
    ktLink,

    // IP 유형
    ipType1,
    ipType2,
    ipType3,
    rep,

    // 장비/자산
    deviceName,
    deviceType,
    deviceIdErp,
    deviceIdNms,
    facilityBarcode,
    svcType,

    // 조직
    station,
    hq,
    center,
    dept,
    dumunNm,
    dumunCd,
    officeCd,
    bonbuCd,
    centerCd,
    deptCd,

    // 설치/수용/보유
    vaccine,
    webshell,
    udAgent,
    smpAgent,
    personalInfo,
    tacs,
    accountSystem,

    // OS/DB
    osType,
    osVer,
    dbType,
    dbVer,

    // 기타
    hostId,
    hostName,
    installLoc,
    baseDt,
    createDt,
    createdAt,
    createUser,
    createdBy,
    updateDt,
    updatedAt,
    updateUser,
    updatedBy,
    comment,
    fromAuto,
    fromManual,
    conflicted,
    source,
  } = raw;

  const newId =
      id ||
      (crypto.randomUUID
          ? crypto.randomUUID()
          : crypto.randomBytes(16).toString("hex"));

  const created = normalizeKstDateString(createDt || createdAt || now);
  const updated = normalizeKstDateString(updateDt || updatedAt || created);

  return {
    // 식별자
    id: newId,

    // 기준일자
    baseDt: baseDt || "",

    // IP / 망 계열
    ipAddress: ip || "",
    netCategory: netAttr || "", // 망속성
    netType: netType1 || netType2 || "", // 망유형
    assetType: "네트워크", // ✅ UI 옵션과 동일 라벨로 저장

    // 장비 계열
    deviceId: deviceIdNms || deviceIdErp || "",
    deviceName: deviceName || "",
    deviceType: deviceType || "",

    // 조직 계열
    bumunNm: dumunNm || "네트워크부문",
    bumunCd: dumunCd || null,
    officeNm: station || "", // 운용국사
    officeCd: officeCd || null,
    bonbuNm: hq || "", // 운용본부
    bonbuCd: bonbuCd || null,
    centerNm: center || "", // 운용센터
    centerCd: centerCd || null,
    deptNm: dept || "", // 운용부서
    deptCd: deptCd || null,

    // 설치/수용/보유 계열
    externalNetYn: ktLink ?? null,
    privacyInfoYn: personalInfo ?? null,
    tacsYn: tacs ?? null,
    accntMgmtYn: accountSystem ?? null,
    vaccineYn: vaccine ?? null,
    webshellYn: webshell ?? null,
    udagentYn: udAgent ?? null,
    smpagentYn: smpAgent ?? null,

    // IP 유형 / 대표 IP
    ipType1: ipType1 ?? null,
    ipType2: ipType2 ?? null,
    ipType3: ipType3 ?? null,
    representYn: rep ?? null,

    // OS / DB
    osType: osType ?? null,
    osVersion: osVer ?? null,
    dbType: dbType ?? null,
    dbVersion: dbVer ?? null,

    // 기타
    hostId: hostId ?? null,
    hostName: hostName ?? null,
    instLocation: installLoc ?? null,
    erpBarcode: facilityBarcode ?? null,
    svcType: svcType ?? null,

    // 생성/수정 메타
    createDt: created,
    createUser: createUser || createdBy || null,
    updateDt: updated,
    updateUser: updateUser || updatedBy || null,

    comment: comment ?? null,
    fromAuto: fromAuto ?? null,
    fromManual: fromManual ?? null,
    conflicted: conflicted ?? null,
    source: source ?? "TODAY",
  };
}

/** ipbook-data.json 로드 */
function loadIpRowsFromJson() {
  try {
    const raw = fs.readFileSync(IP_DATA_PATH, "utf-8");
    const parsed = JSON.parse(raw);
    if (!Array.isArray(parsed)) {
      console.error("[WAS] ipbook-data.json 내용이 배열이 아닙니다.");
      ipRows = [];
      return;
    }

    const normalized = parsed
        .map((r) => normalizeRowFromFile(r))
        .filter((r) => r != null)
        .map((r) => ({ ...r, assetType: normalizeAssetTypeLabel(r.assetType) }));

    ipRows = normalized;
    console.log(`[WAS] ipbook-data.json 로딩 완료 (rows=${ipRows.length}) (normalized)`);
  } catch (err) {
    console.error("[WAS] ipbook-data.json 로딩 실패:", err.message);
    ipRows = [];
  }
}

/** ipbook-data.json 저장 */
function saveIpRowsToJson() {
  try {
    fs.writeFileSync(IP_DATA_PATH, JSON.stringify(ipRows, null, 2), "utf-8");
    console.log(`[WAS] ipbook-data.json 저장 완료 (rows=${ipRows.length})`);
  } catch (err) {
    console.error("[WAS] ipbook-data.json 저장 실패:", err.message);
    throw err;
  }
}

// 서버 시작 시 1회 로드
loadIpRowsFromJson();

function uniqueNonEmpty(values) {
  return Array.from(
      new Set(
          (values || [])
              .map((v) => (v == null ? "" : String(v).trim()))
              .filter((v) => v && v !== "-")
      )
  );
}

/**
 * orgTree 생성
 * bumunNm(운용부문) -> bonbuNm(본부) -> centerNm(센터) -> deptNm(부서)
 */
function buildOrgListFromRows(rows) {
  const divisionMap = new Map(); // key: bumunNm

  (rows || []).forEach((row) => {
    const bumunNm = row.bumunNm || "네트워크부문";
    const bonbuNm = row.bonbuNm || "기타본부";
    const centerNm = row.centerNm || "기타센터";
    const deptNm = row.deptNm || "기타부서";

    let divNode = divisionMap.get(bumunNm);
    if (!divNode) {
      divNode = { orgNm: bumunNm, children: [] };
      divisionMap.set(bumunNm, divNode);
    }

    let hqNode = divNode.children.find((h) => h.orgNm === bonbuNm);
    if (!hqNode) {
      hqNode = { orgNm: bonbuNm, children: [] };
      divNode.children.push(hqNode);
    }

    let centerNode = hqNode.children.find((c) => c.orgNm === centerNm);
    if (!centerNode) {
      centerNode = { orgNm: centerNm, children: [] };
      hqNode.children.push(centerNode);
    }

    if (deptNm && !centerNode.children.find((d) => d.orgNm === deptNm)) {
      centerNode.children.push({ orgNm: deptNm });
    }
  });

  return Array.from(divisionMap.values());
}

function loadAccounts() {
  const accountsPath = path.join(__dirname, "accounts.json");
  const raw = fs.readFileSync(accountsPath, "utf-8");
  return JSON.parse(raw);
}

function generateToken() {
  return crypto.randomBytes(32).toString("hex");
}

// ✅ IP 마스킹 (서버 책임)
function maskIp(ip) {
  const s = String(ip ?? "");
  const parts = s.split(".");
  if (parts.length !== 4) return s;
  return `${parts[0]}.${parts[1]}.${parts[2]}.***`;
}

// ✅ IP 정렬용 tuple
function ipToTuple(ip) {
  const parts = String(ip ?? "")
      .split(".")
      .map((p) => {
        const n = parseInt(p, 10);
        return Number.isNaN(n) ? 0 : n;
      });
  while (parts.length < 4) parts.push(0);
  return parts.slice(0, 4);
}

// -----------------------------
// 서버 공통 설정
// -----------------------------
app.use(express.json());

// 간단한 로거
app.use((req, res, next) => {
  const start = Date.now();
  res.on("finish", () => {
    const ms = Date.now() - start;
    console.log(`[WAS] ${req.method} ${req.originalUrl} ${res.statusCode} ${ms}ms`);
  });
  next();
});

// -----------------------------
// Auth APIs
// -----------------------------

// 로그인
app.post("/api/auth/login", (req, res) => {
  const pathName = "/api/auth/login";
  const { loginId, password } = req.body || {};

  if (!loginId || !password) {
    return res.status(401).json({
      timestamp: nowIso(),
      status: 401,
      error: "Unauthorized",
      path: pathName,
      return: null,
    });
  }

  const accounts = loadAccounts();
  const found = accounts.find(
      (a) => a.id === String(loginId) && a.pw === String(password)
  );

  if (!found) {
    return res.status(404).json({
      timestamp: nowIso(),
      status: 404,
      error: "Not Found",
      path: pathName,
      return: null,
    });
  }

  const accessToken = generateToken();
  const refreshToken = generateToken();

  sessions.set(accessToken, {
    loginId: found.id,
    refreshToken,
    role: found.role,
    createdAt: nowIso(),
  });

  return res.status(200).json({
    timestamp: nowIso(),
    status: 200,
    path: pathName,
    accessToken,
    refreshToken,
    role: found.role,
    loginId: found.id,
    return: {
      accessToken,
      refreshToken,
      role: found.role,
      loginId: found.id,
    },
  });
});

// 로그아웃
app.post("/api/auth/logout", (req, res) => {
  const pathName = "/api/auth/logout";
  const { accessToken, refreshToken } = req.body || {};

  if (!accessToken) {
    return res.status(401).json({
      timestamp: nowIso(),
      status: 401,
      error: "Unauthorized",
      path: pathName,
      return: null,
    });
  }

  const session = sessions.get(accessToken);
  if (!session || session.refreshToken !== refreshToken) {
    return res.status(200).json({
      timestamp: nowIso(),
      status: 200,
      path: pathName,
      return: { success: true, alreadyLoggedOut: true },
    });
  }

  sessions.delete(accessToken);

  return res.status(200).json({
    timestamp: nowIso(),
    status: 200,
    path: pathName,
    return: { success: true },
  });
});

// -----------------------------
// IP-BOOK 필터 API
// -----------------------------
app.get("/api/ipbook/filters", (req, res) => {
  console.log("[WAS] /api/ipbook/filters");

  const rows = ipRows;

  // ✅ orgList 는 filterSample.json 그대로 사용(있으면)
  const sample = loadFilterSampleJson();
  const orgList = Array.isArray(sample) ? sample : buildOrgListFromRows(rows);

  const netCategoryList = uniqueNonEmpty(rows.map((r) => r.netCategory));
  const netTypeList = uniqueNonEmpty(rows.map((r) => r.netType));
  const deviceTypeList = uniqueNonEmpty(rows.map((r) => r.deviceType));
  const ipType1List = uniqueNonEmpty(rows.map((r) => r.ipType1));
  const ipType2List = uniqueNonEmpty(rows.map((r) => r.ipType2));
  const ipType3List = uniqueNonEmpty(rows.map((r) => r.ipType3));
  const osTypeList = uniqueNonEmpty(rows.map((r) => r.osType));
  const dbTypeList = uniqueNonEmpty(rows.map((r) => r.dbType));

  return res.status(200).json({
    orgList,
    netCategoryList,
    netTypeList,
    deviceTypeList,
    ipType1List,
    ipType2List,
    ipType3List,
    osTypeList,
    dbTypeList,
  });
});

// -----------------------------
// IP-BOOK 조회 API (웹 최신: POST /api/ipbook)
// -----------------------------
function matchesKeywordRow(row, keyword) {
  const kw = String(keyword ?? "").trim();
  if (!kw) return true;

  // 웹 placeholder 기준:
  // "IP / 장비명 / 설비바코드(ERP) / 장비ID(NMS) / 생성자"
  const targets = [
    row.ipAddress,
    row.deviceName,
    row.erpBarcode,
    row.deviceId,
    row.createUser,
  ]
      .filter(Boolean)
      .map((v) => String(v));

  return targets.some((t) => t.includes(kw));
}

function mapAssetTypeFilterToLabel(assetType) {
  // 웹: "network" | "server" | null
  if (assetType === "network") return "네트워크";
  if (assetType === "server") return "서버";
  return null;
}

app.post("/api/ipbook", (req, res) => {
  const pathName = "/api/ipbook";
  const { filter = {}, page = {} } = req.body || {};
  console.log("[WAS] /api/ipbook filter:", filter, "page:", page);

  const {
    // 조직 (웹 최신 key)
    bumunNm,
    bonbuNm,
    centerNm,
    deptNm,

    // 자산유형 (웹: network/server/null)
    assetType,

    // 기타 필터
    netCategory,
    netType,
    deviceType,

    ipType1,
    ipType2,
    ipType3,

    osType,
    dbType, // 웹에서는 ""로 고정이라 사실상 미사용

    baseDt,
    keyword,
    showIp,
    sortKey,
  } = filter || {};

  let rows = ipRows.slice();

  // 조직 필터
  if (bumunNm) rows = rows.filter((r) => String(r.bumunNm || "") === String(bumunNm));
  if (bonbuNm) rows = rows.filter((r) => String(r.bonbuNm || "") === String(bonbuNm));
  if (centerNm) rows = rows.filter((r) => String(r.centerNm || "") === String(centerNm));
  if (deptNm) rows = rows.filter((r) => String(r.deptNm || "") === String(deptNm));

  // 자산유형 필터
  const assetLabel = mapAssetTypeFilterToLabel(assetType);
  if (assetLabel) {
    rows = rows.filter((r) => normalizeAssetTypeLabel(r.assetType) === assetLabel);
  }

  // 망속성/망유형/장비유형/OS/DB/IP유형 필터
  if (netCategory) rows = rows.filter((r) => String(r.netCategory || "") === String(netCategory));
  if (netType) rows = rows.filter((r) => String(r.netType || "") === String(netType));
  if (deviceType) rows = rows.filter((r) => String(r.deviceType || "") === String(deviceType));
  if (ipType1) rows = rows.filter((r) => String(r.ipType1 || "") === String(ipType1));
  if (ipType2) rows = rows.filter((r) => String(r.ipType2 || "") === String(ipType2));
  if (ipType3) rows = rows.filter((r) => String(r.ipType3 || "") === String(ipType3));
  if (osType) rows = rows.filter((r) => String(r.osType || "") === String(osType));
  if (dbType) rows = rows.filter((r) => String(r.dbType || "") === String(dbType));

  // 기준날짜
  if (baseDt) rows = rows.filter((r) => String(r.baseDt || "") === String(baseDt));

  // 키워드
  if (keyword) rows = rows.filter((r) => matchesKeywordRow(r, keyword));

  // 정렬
  const effectiveSortKey = sortKey || "최신";
  let sortedRows = rows.slice();

  if (effectiveSortKey === "IP주소") {
    sortedRows.sort((a, b) => {
      const ta = ipToTuple(a.ipAddress);
      const tb = ipToTuple(b.ipAddress);
      for (let i = 0; i < 4; i++) {
        if (ta[i] !== tb[i]) return ta[i] - tb[i];
      }
      return 0;
    });
  } else if (effectiveSortKey === "망속성") {
    sortedRows.sort((a, b) =>
        String(a.netCategory || "").localeCompare(String(b.netCategory || ""))
    );
  } else if (effectiveSortKey === "망유형") {
    sortedRows.sort((a, b) =>
        String(a.netType || "").localeCompare(String(b.netType || ""))
    );
  } else {
    // 최신: updateDt > createDt 기준
    sortedRows.sort((a, b) => {
      const aKey = String(a.updateDt || a.createDt || "");
      const bKey = String(b.updateDt || b.createDt || "");
      return bKey.localeCompare(aKey);
    });
  }

  const totalCount = sortedRows.length;

  const pageNo = Number(page.page) || 1;
  const pagePerPage = Number(page.pagePerPage) || totalCount || 1;
  const start = (pageNo - 1) * pagePerPage;
  const end = start + pagePerPage;

  const pageRows = sortedRows.slice(start, end);

  // IP 표시 여부
  const showIpFlag =
      showIp === true || showIp === 1 || showIp === "1" || showIp === "true";

  const responseRows = pageRows.map((r) => ({
    ...r,
    assetType: normalizeAssetTypeLabel(r.assetType),
    ipAddress: showIpFlag ? r.ipAddress : maskIp(r.ipAddress),
  }));

  // ✅ 웹 우선 분기: body.data 배열 + page.totalCount
  return res.status(200).json({
    timestamp: nowIso(),
    status: 200,
    path: pathName,
    data: responseRows,
    page: {
      page: pageNo,
      pagePerPage,
      totalCount,
    },
  });
});

// -----------------------------
// IP-BOOK 행 추가/수정 공통
// -----------------------------
function insertRowAndSave(pathName, rawRow, res) {
  if (!rawRow || typeof rawRow !== "object") {
    return res.status(400).json({
      timestamp: nowIso(),
      status: 400,
      error: "Bad Request",
      path: pathName,
      return: null,
    });
  }

  const now = nowKstString();

  const rowWithDates = {
    ...rawRow,
    assetType: normalizeAssetTypeLabel(rawRow.assetType),
    createDt: rawRow.createDt || rawRow.createdAt || now,
    updateDt: now,
  };

  const normalized = normalizeRowFromFile(rowWithDates);

  // 앞쪽에 추가
  ipRows.unshift(normalized);

  try {
    saveIpRowsToJson();
  } catch (err) {
    console.error(`[WAS] ${pathName} save error:`, err);
    return res.status(500).json({
      timestamp: nowIso(),
      status: 500,
      error: "Internal Server Error",
      path: pathName,
      return: null,
    });
  }

  return res.status(200).json({
    timestamp: nowIso(),
    status: 200,
    path: pathName,
    return: { row: normalized },
    row: normalized, // 일부 코드가 body.row도 보게 되어있어서 같이 제공
  });
}

// -----------------------------
// 웹 최신 저장 경로
// POST /api/ipbook/:deptCd/:deviceName/:ipAddress
// PUT  /api/ipbook/:deptCd/:deviceName/:ipAddress
// -----------------------------
app.post("/api/ipbook/:deptCd/:deviceName/:ipAddress", (req, res) => {
  const { deptCd, deviceName, ipAddress } = req.params;
  const pathName = `/api/ipbook/${deptCd}/${deviceName}/${ipAddress}`;

  const payload = req.body || {};

  // URL param 우선
  const row = {
    ...payload,
    deptCd,
    deviceName,
    ipAddress,
  };

  // ✅ add 시 assetType 없으면 기본 "네트워크"로(기존 동작 유지)
  if (!row.assetType) row.assetType = "네트워크";

  return insertRowAndSave(pathName, row, res);
});

app.put("/api/ipbook/:deptCd/:deviceName/:ipAddress", (req, res) => {
  const { deptCd, deviceName, ipAddress } = req.params;
  const pathName = `/api/ipbook/${deptCd}/${deviceName}/${ipAddress}`;
  const body = req.body || {};

  const idx = ipRows.findIndex(
      (r) =>
          String(r.deptCd || "") === String(deptCd) &&
          String(r.deviceName || "") === String(deviceName) &&
          String(r.ipAddress || "") === String(ipAddress)
  );

  if (idx === -1) {
    return res.status(404).json({
      timestamp: nowIso(),
      status: 404,
      error: "Not Found",
      path: pathName,
      return: null,
    });
  }

  const existing = ipRows[idx];
  const now = nowKstString();

  const mergedRaw = {
    ...existing,
    ...body,
    deptCd,
    deviceName,
    ipAddress,
    assetType: normalizeAssetTypeLabel(body.assetType ?? existing.assetType),
    createDt: existing.createDt || existing.createdAt || now,
    updateDt: now,
  };

  const normalized = normalizeRowFromFile(mergedRaw);
  ipRows[idx] = normalized;

  try {
    saveIpRowsToJson();
  } catch (err) {
    console.error("[WAS] update save error:", err);
    return res.status(500).json({
      timestamp: nowIso(),
      status: 500,
      error: "Internal Server Error",
      path: pathName,
      return: null,
    });
  }

  return res.status(200).json({
    timestamp: nowIso(),
    status: 200,
    path: pathName,
    return: { row: normalized },
    row: normalized,
  });
});

// -----------------------------
// 업로드: 멀티파트 파서(외부 의존성 없이 단일 file만 처리)
// -----------------------------
function readMultipartSingleFile(req) {
  const ct = String(req.headers["content-type"] || "");
  if (!ct.includes("multipart/form-data")) return null;

  const m = ct.match(/boundary=([^;]+)/i);
  if (!m) return null;

  const boundary = m[1];
  const buf = req.body; // express.raw 로 받아야 함
  if (!Buffer.isBuffer(buf)) return null;

  // latin1은 byte 1:1 매핑이라 binary split에 안전
  const s = buf.toString("latin1");
  const marker = `--${boundary}`;
  const parts = s.split(marker);

  for (const part of parts) {
    // 마지막 종료부는 무시
    if (!part || part === "--\r\n" || part === "--") continue;

    // 앞 \r\n 제거
    const p = part.startsWith("\r\n") ? part.slice(2) : part;

    const headerEndIdx = p.indexOf("\r\n\r\n");
    if (headerEndIdx < 0) continue;

    const headerText = p.slice(0, headerEndIdx);
    const bodyTextWithTail = p.slice(headerEndIdx + 4);

    const disp = headerText
        .split("\r\n")
        .find((h) => h.toLowerCase().startsWith("content-disposition:")) || "";

    if (!disp.includes('name="file"')) continue;

    // filename 추출(선택)
    const fnMatch = disp.match(/filename="([^"]*)"/i);
    const filename = fnMatch ? fnMatch[1] : "upload.xlsx";

    // 본문은 뒤쪽에 \r\n 이랑 "--" 꼬리 달릴 수 있음
    // 파트는 boundary split 기준이라 이미 boundary는 제거된 상태
    // 끝의 \r\n 을 한 번 제거
    let bodyText = bodyTextWithTail;
    if (bodyText.endsWith("\r\n")) bodyText = bodyText.slice(0, -2);
    if (bodyText.endsWith("--")) bodyText = bodyText.slice(0, -2);

    const fileBuffer = Buffer.from(bodyText, "latin1");
    return { filename, buffer: fileBuffer };
  }

  return null;
}

// -----------------------------
// 업로드: XLSX 파싱/검증/중복처리
// -----------------------------
const EXCEL_HEADER_MAP = {
  "IP주소": "ipAddress",
  "자산유형": "assetType",
  "망속성": "netCategory",
  "망유형": "netType",
  "장비유형": "deviceType",
  "장비ID": "deviceId",
  "장비명": "deviceName",
  "운용국사": "officeNm",
  "운용본부": "bonbuNm",
  "운용센터": "centerNm",
  "운용부서": "deptNm",
  "부서코드": "deptCd",
  "운용부문": "bumunNm",
  "호스트명": "hostName",
  "호스트ID": "hostId",
  "설비바코드": "erpBarcode",
  "OS유형": "osType",
  "OS버전": "osVersion",
  "DB유형": "dbType",
  "DB버전": "dbVersion",
  "KT외타망연동여부": "externalNetYn",
  "개인정보보유여부": "privacyInfoYn",
  "TACS수용여부": "tacsYn",
  "계정관리시스템수용여부": "accntMgmtYn",
  "백신설치여부": "vaccineYn",
  "웹셀탐지Tool설치여부": "webshellYn",
  "UD Agent 설치 여부": "udagentYn",
  "SMP Agent 설치 여부": "smpagentYn",
  "대표IP 사용여부": "representYn",
  "IP유형1": "ipType1",
  "IP유형2": "ipType2",
  "IP유형3": "ipType3",
  "비고": "comment",
};

function toYnValue(v) {
  const s = String(v ?? "").trim();
  if (!s) return "";
  if (s === "Y" || s === "y") return "Y";
  if (s === "N" || s === "n") return "N";
  // UI 옵션(연동/미연동, 사용/미사용 등)은 실제 프로젝트에 맞춰 확장 가능
  return s;
}

function makeDuplicateKey(row) {
  // ✅ 중복 기준: IP + 망속성(netCategory)
  const ip = String(row.ipAddress || "").trim();
  const cat = String(row.netCategory || "").trim();
  return `${ip}||${cat}`;
}

async function parseXlsxToRows(buffer) {
  // xlsx 패키지 사용(프로젝트에 있으면 동작)
  const mod = await import("xlsx");
  const XLSX = mod.default || mod;

  const wb = XLSX.read(buffer, { type: "buffer" });
  const sheetName = wb.SheetNames?.[0];
  if (!sheetName) return [];
  const ws = wb.Sheets[sheetName];

  const raw = XLSX.utils.sheet_to_json(ws, { defval: "", raw: false });

  // 헤더가 한글이면 그대로 매핑, 이미 key면 그대로
  const mapped = raw.map((r) => {
    const out = {};
    Object.keys(r || {}).forEach((k) => {
      const key = EXCEL_HEADER_MAP[k] || k;
      out[key] = r[k];
    });
    return out;
  });

  return mapped;
}

async function buildErrorXlsxBase64(errorRows) {
  const mod = await import("xlsx");
  const XLSX = mod.default || mod;

  const ws = XLSX.utils.json_to_sheet(errorRows);
  const wb = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(wb, ws, "errors");

  const outBuf = XLSX.write(wb, { type: "buffer", bookType: "xlsx" });
  return Buffer.from(outBuf).toString("base64");
}

async function handleUpload(req, res, { forceAssetTypeLabel }) {
  const pathName = req.originalUrl;

  const file = readMultipartSingleFile(req);
  if (!file) {
    return res.status(400).json({
      timestamp: nowIso(),
      status: 400,
      error: "Bad Request",
      path: pathName,
      message: "file is required",
    });
  }

  let parsedRows = [];
  try {
    parsedRows = await parseXlsxToRows(file.buffer);
  } catch (e) {
    return res.status(500).json({
      timestamp: nowIso(),
      status: 500,
      error: "Internal Server Error",
      path: pathName,
      message: "xlsx parser error (is 'xlsx' installed?)",
    });
  }

  const now = nowKstString();

  const existingKeySet = new Set(ipRows.map((r) => makeDuplicateKey(r)));

  let insertedCount = 0;
  let duplicateCount = 0;
  let validationFailCount = 0;

  const errorList = [];

  for (const r of parsedRows) {
    const row = { ...r };

    // 업로드 타입(network/server)에 따라 자산유형 강제
    row.assetType = forceAssetTypeLabel;

    // 필수값 검증(웹 saveInline과 동일 기준)
    const ipAddress = String(row.ipAddress || "").trim();
    const deviceName = String(row.deviceName || "").trim();
    const deptCd = String(row.deptCd || "").trim();

    if (!ipAddress || !deviceName || !deptCd) {
      validationFailCount += 1;
      errorList.push({
        ...row,
        reason: "필수 누락: deptCd / deviceName / ipAddress",
      });
      continue;
    }

    // Y/N 필드 정리(빈 값이면 빈 값 유지)
    row.externalNetYn = toYnValue(row.externalNetYn) || row.externalNetYn;
    row.privacyInfoYn = toYnValue(row.privacyInfoYn) || row.privacyInfoYn;
    row.tacsYn = toYnValue(row.tacsYn) || row.tacsYn;
    row.accntMgmtYn = toYnValue(row.accntMgmtYn) || row.accntMgmtYn;
    row.vaccineYn = toYnValue(row.vaccineYn) || row.vaccineYn;
    row.webshellYn = toYnValue(row.webshellYn) || row.webshellYn;
    row.udagentYn = toYnValue(row.udagentYn) || row.udagentYn;
    row.smpagentYn = toYnValue(row.smpagentYn) || row.smpagentYn;
    row.smpagentYn = toYnValue(row.smpagentYn) || row.smpagentYn;
    row.representYn = toYnValue(row.representYn) || row.representYn;

    // 날짜 세팅
    row.createDt = row.createDt || now;
    row.updateDt = now;

    const dupKey = makeDuplicateKey(row);
    if (existingKeySet.has(dupKey)) {
      duplicateCount += 1;
      errorList.push({
        ...row,
        reason: "중복: IP + 망속성(netCategory)",
      });
      continue;
    }

    // 정상 insert
    const normalized = normalizeRowFromFile(row);
    ipRows.unshift(normalized);
    existingKeySet.add(dupKey);
    insertedCount += 1;
  }

  try {
    saveIpRowsToJson();
  } catch (e) {
    return res.status(500).json({
      timestamp: nowIso(),
      status: 500,
      error: "Internal Server Error",
      path: pathName,
      message: "save failed",
    });
  }

  // 에러 파일 생성(에러가 있을 때만)
  let errorFileBase64 = null;
  let errorFileName = null;

  if (errorList.length > 0) {
    try {
      errorFileBase64 = await buildErrorXlsxBase64(errorList);
      errorFileName = `upload_error_${Date.now()}.xlsx`;
    } catch (e) {
      // 에러 파일 생성 실패는 업로드 자체 실패로 보지 않음
      errorFileBase64 = null;
      errorFileName = null;
    }
  }

  return res.status(200).json({
    insertedCount,
    validationFailCount,
    duplicateCount,
    errorFileBase64,
    errorFileName,
  });
}

// 업로드 라우트는 raw로 받아야 함 (multipart)
const uploadRaw = express.raw({ type: () => true, limit: "50mb" });

app.post("/api/ipbook/network/upload", uploadRaw, (req, res) =>
    handleUpload(req, res, { forceAssetTypeLabel: "네트워크" })
);

app.post("/api/ipbook/server/upload", uploadRaw, (req, res) =>
    handleUpload(req, res, { forceAssetTypeLabel: "서버" })
);

// -----------------------------
// 정적 파일 (빌드 후)
// -----------------------------
const distDir = path.join(__dirname, "..", "dist");
if (fs.existsSync(distDir)) {
  app.use(express.static(distDir));

  app.get(/^(?!\/api\/).*/, (req, res) => {
    res.sendFile(path.join(distDir, "index.html"));
  });
}

app.listen(PORT, () => {
  console.log(`IP-ONE WAS listening on http://localhost:${PORT}`);
});