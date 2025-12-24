import { useEffect, useMemo, useRef, useState } from "react";
import Button from "../shared/ui/Button.jsx";
import SelectField from "../shared/ui/SelectField.jsx";
import DateField from "../shared/ui/DateField.jsx";
import InputField from "../shared/ui/InputField.jsx";
import CardHeader from "../shared/ui/CardHeader.jsx";
import DataTable from "../shared/ui/DataTable.jsx";
import AlertPopup from "../shared/ui/AlertPopup.jsx";
import "../styles/network-page.css";
import "../styles/form.css";
import { ipToTuple } from "../utils/ip.js";
import { downloadAsXlsx } from "../utils/excel.js";
import httpClient from "../api/httpClient.js";

const ALL = "전체";

/** ✅ 선택형 옵션 (기본값만 ALL, 실제 값은 서버에서 세팅) */
const DEVICE_TYPE_OPTIONS = [ALL];
const NET_ATTR_OPTIONS = [ALL]; // netCategory
const NET_TYPE_OPTIONS = [ALL]; // netType
const IP_TYPE1_OPTIONS = [ALL];
const IP_TYPE2_OPTIONS = [ALL];
const IP_TYPE3_OPTIONS = [ALL];
const OS_TYPE_OPTIONS = [ALL];
const DB_TYPE_OPTIONS = [ALL];

/** ✅ 자산 유형 옵션 (필터용) */
const ASSET_TYPE_OPTIONS = [ALL, "network", "server"];

/** ✅ Y/N 계열 옵션 */
const EXTERNAL_NET_OPTIONS = ["연동", "미연동"]; // KT외타망연동여부
const REP_OPTIONS = ["사용", "미사용"]; // 대표IP 사용여부
const INSTALL_OPTIONS = ["설치", "미설치"]; // 설치여부 (백신 등)
const PERSONAL_INFO_OPTIONS = ["보유", "미보유"]; // 개인정보보유여부
const ACCEPT_OPTIONS = ["수용", "미수용"]; // 수용여부 (TACS, 계정)

/** ✅ 정렬 옵션 */
const SORT_OPTIONS = ["수정일자", "생성일자", "IP"];

/** ✅ 테이블 컬럼 정의 (요청한 순서 그대로) */
const columnDefs = [
  { key: "ipAddress", label: "IP주소", sticky: true },
  { key: "assetType", label: "자산유형" },

  { key: "netCategory", label: "망속성" },
  { key: "netType", label: "망유형" },
  { key: "ipType1", label: "IP유형1" },
  { key: "ipType2", label: "IP유형2" },
  { key: "ipType3", label: "IP유형3" },
  { key: "representYn", label: "대표IP 사용여부" },

  { key: "deviceName", label: "장비명" },
  { key: "deviceType", label: "장비유형" },
  { key: "deviceId", label: "장비ID(NMS)" },

  { key: "osType", label: "OS유형", headerGrey: true },
  { key: "osVersion", label: "OS버전", headerGrey: true },
  { key: "dbType", label: "DB유형", headerGrey: true },
  { key: "dbVersion", label: "DB버전", headerGrey: true },

  { key: "hostName", label: "호스트명", headerGrey: true },
  { key: "hostId", label: "호스트ID(ITAM)", headerGrey: true },
  { key: "erpBarcode", label: "설비바코드(ERP)", headerGrey: true },

  { key: "vaccineYn", label: "백신설치", headerGrey: true },
  { key: "webshellYn", label: "웹쉘탐지Tool설치", headerGrey: true },
  { key: "udagentYn", label: "UDAgent설치", headerGrey: true },
  { key: "smpagentYn", label: "SMPAgent설치", headerGrey: true },
  { key: "privacyInfoYn", label: "개인정보보유", headerGrey: true },
  { key: "tacsYn", label: "TACS수용", headerGrey: true },
  { key: "accntMgmtYn", label: "계정관리시스템수용", headerGrey: true },

  { key: "officeNm", label: "운용국사" },
  { key: "instLocation", label: "설치위치" },

  // ✅ 아래 테이블 컬럼에서는 운용부문 제외 (필터에는 유지)
  // { key: "dumunNm", label: "운용부문" },
  { key: "bonbuNm", label: "운용본부" },
  { key: "centerNm", label: "운용센터" },
  { key: "deptNm", label: "운용부서" },

  { key: "externalNetYn", label: "KT외타망연동여부" },


  { key: "createDt", label: "생성일자" },
  { key: "createUser", label: "생성자ID" },
  { key: "createUserName", label: "생성자" },
  { key: "updateDt", label: "최종수정일자" },
  { key: "updateUser", label: "최종수정자ID" },
  { key: "updateUserName", label: "최종수정자" },
];

/** ✅ 필수 입력 (새 스키마 기준) */
const REQUIRED_KEYS = [
  "ipAddress",
  "netCategory",
  "netType",
  "deviceName",
    // "deviceType",
    "deviceId",
//     "hostName",
//     "hostId",
//     "privacyInfoYn",
//     "tacsYn",
//     "officeNm",
//     "externalNetYn",
// "assetType",
  "bonbuNm",
  "centerNm",
  "deptNm",
];

// ✅ 필수 항목 → 한글 라벨 매핑
const REQUIRED_KEY_LABELS = REQUIRED_KEYS.reduce((acc, key) => {
  const col = columnDefs.find((c) => c.key === key);
  acc[key] = col ? col.label : key;
  return acc;
}, {});

/** ✅ 행 추가 시 수정 가능 필드 */
const ADD_EDITABLE_KEYS = new Set([
  "ipAddress",
  "deviceId",
  "deviceName",
  "deviceType",
  "officeNm",
  "bonbuNm",
  "centerNm",
  "deptNm",
  "hostId",
  "hostName",
  "netCategory",
  "netType",
  "externalNetYn",
  "privacyInfoYn",
  "tacsYn",
    "assetType",
]);

/** ✅ 행 수정 시 수정 가능 필드 */
const EDIT_EDITABLE_KEYS = new Set([
  "deviceId",
  "deviceType",
  "officeNm",
  "hostId",
  "hostName",
  "netCategory",
  "netType",
  "externalNetYn",
  "privacyInfoYn",
  "tacsYn",
    "assetType",
]);

/** ✅ orgTree에서 HQ / Center / Dept 리스트 추출 유틸 */
function getCenterOptionsFromOrgTree(orgTree, hqName, fallbackCenters = []) {
  if (!hqName) return fallbackCenters;

  const centers = new Set();
  (orgTree || []).forEach((divNode) => {
    (divNode.children || []).forEach((hqNode) => {
      if (hqNode?.orgNm !== hqName) return;
      (hqNode.children || []).forEach((centerNode) => {
        if (centerNode?.orgNm) centers.add(centerNode.orgNm);
      });
    });
  });

  const arr = Array.from(centers);
  return arr.length ? arr : fallbackCenters;
}

function getDeptOptionsFromOrgTree(orgTree, hqName, centerName, fallbackDepts = []) {
  if (!hqName && !centerName) return fallbackDepts;

  const depts = new Set();
  (orgTree || []).forEach((divNode) => {
    (divNode.children || []).forEach((hqNode) => {
      if (hqName && hqNode?.orgNm !== hqName) return;

      (hqNode.children || []).forEach((centerNode) => {
        if (centerName && centerNode?.orgNm !== centerName) return;

        (centerNode.children || []).forEach((deptNode) => {
          if (deptNode?.orgNm) depts.add(deptNode.orgNm);
        });
      });
    });
  });

  const arr = Array.from(depts);
  return arr.length ? arr : fallbackDepts;
}

function uid() {
  return Math.random().toString(36).slice(2) + Date.now().toString(36);
}

function normalizeStr(v) {
  return String(v ?? "").trim();
}

function normalizeFilter(v) {
  return v === ALL ? "" : v;
}

/** ✅ base64 파일 다운로드 */
function downloadBase64File(base64, filename) {
  const clean = String(base64 || "")
      .replace(/^data:.*;base64,/, "")
      .trim();

  const byteCharacters = atob(clean);
  const byteNumbers = new Array(byteCharacters.length);
  for (let i = 0; i < byteCharacters.length; i++) {
    byteNumbers[i] = byteCharacters.charCodeAt(i);
  }
  const byteArray = new Uint8Array(byteNumbers);

  const blob = new Blob([byteArray], {
    type: "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
  });

  const url = window.URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = filename || "error.xlsx";
  document.body.appendChild(a);
  a.click();
  a.remove();
  window.URL.revokeObjectURL(url);
}

export default function NetworkStatusPage() {
  // 조직 트리 및 옵션 상태
  const [orgTree, setOrgTree] = useState([]);
  const [divisionOptions, setDivisionOptions] = useState([ALL]); // 운용부문
  const [hqOptions, setHqOptions] = useState([ALL]); // 운용본부
  const [centerOptions, setCenterOptions] = useState([ALL]); // 운용센터
  const [deptOptions, setDeptOptions] = useState([ALL]); // 운용부서

  // ✅ 행추가/수정에서 쓸 "전체" 조직 목록
  const [allHqOptions, setAllHqOptions] = useState([]);
  const [allCenterOptions, setAllCenterOptions] = useState([]);
  const [allDeptOptions, setAllDeptOptions] = useState([]);

  const [deviceTypeOptions, setDeviceTypeOptions] = useState(DEVICE_TYPE_OPTIONS);
  const [netAttrOptions, setNetAttrOptions] = useState(NET_ATTR_OPTIONS);
  const [netTypeOptions, setNetTypeOptions] = useState(NET_TYPE_OPTIONS);

  const [ipType1Options, setIpType1Options] = useState(IP_TYPE1_OPTIONS);
  const [ipType2Options, setIpType2Options] = useState(IP_TYPE2_OPTIONS);
  const [ipType3Options, setIpType3Options] = useState(IP_TYPE3_OPTIONS);
  const [osTypeOptions, setOsTypeOptions] = useState(OS_TYPE_OPTIONS);
  const [dbTypeOptions, setDbTypeOptions] = useState(DB_TYPE_OPTIONS);

  // 서버 조회용 상태
  const [filtersLoaded, setFiltersLoaded] = useState(false);
  const [page, setPage] = useState(1);
  const [pagePerPage, setPagePerPage] = useState(50);
  const [totalCount, setTotalCount] = useState(0);
  const [isLoading, setIsLoading] = useState(false);

  /** ✅ 운용 컨텍스트 (필터용) */
  const [division, setDivision] = useState(ALL); // 운용부문
  const [hq, setHq] = useState(ALL); // 운용본부
  const [center, setCenter] = useState(ALL); // 운용센터
  const [operationDept, setOperationDept] = useState(ALL); // 운용부서

  /** ✅ 표시 옵션 (서버로 전달만, 마스킹은 서버에서) */
  const [showIp, setShowIp] = useState(true);

  const currentUser = useMemo(
      () => ({
        empNo: "10000000",
        dept: operationDept,
      }),
      [operationDept]
  );

  /** ✅ 필터 상태 */
  const [netAttrFilter, setNetAttrFilter] = useState(ALL); // 망속성(netCategory)
  const [netTypeFilter, setNetTypeFilter] = useState(ALL); // 망유형(netType)
  const [ipType1Filter, setIpType1Filter] = useState(ALL);
  const [ipType2Filter, setIpType2Filter] = useState(ALL);
  const [ipType3Filter, setIpType3Filter] = useState(ALL);
  const [deviceTypeFilter, setDeviceTypeFilter] = useState(ALL);
  const [osTypeFilter, setOsTypeFilter] = useState(ALL);
  const [dbTypeFilter, setDbTypeFilter] = useState(ALL);

  /** ✅ 자산유형 (필터용) */
  const [assetType, setAssetType] = useState(ALL);

  const [baseDate, setBaseDate] = useState("");
  const [keyword, setKeyword] = useState("");

  const [sortKey, setSortKey] = useState("수정일자");

  /** ✅ 데이터 */
  const [rows, setRows] = useState([]);
  const [selectedId, setSelectedId] = useState(null);

  /** ✅ 업로드 타입 */
  const [uploadType, setUploadType] = useState(null); // "network" | "server" 추가

  /** ✅ 인라인 추가/수정 공용 상태 */
  const [mode, setMode] = useState(null); // null | "add" | "edit"
  const [editTargetId, setEditTargetId] = useState(null);
  const [draft, setDraft] = useState({});

  /** ✅ 알림 */
  const [alertOpen, setAlertOpen] = useState(false);
  const [alertTitle, setAlertTitle] = useState("안내");
  const [alertMessage, setAlertMessage] = useState("");

  const fileRef = useRef(null);

  /** ✅ 테이블 카드 ref + 인라인 버튼 top 값 */
  const tableCardRef = useRef(null);
  const [inlineAddTop, setInlineAddTop] = useState(null);


// ✅ 하단 고정 가로 스크롤 동기화용
  const tableScrollRef = useRef(null);
  const hScrollRef = useRef(null);
  const syncingRef = useRef(false);

  const [scrollSpacerWidth, setScrollSpacerWidth] = useState(1);
  const [hScrollDock, setHScrollDock] = useState({ left: 0, width: 0, visible: false });
  const [hScrollLayout, setHScrollLayout] = useState({ left: 0, width: 0 }); // 가로 위치/너비 상태 추가

  function openAlert(message, title = "안내") {
    setAlertTitle(title);
    setAlertMessage(message);
    setAlertOpen(true);
  }

  /** ✅ 셀렉트 옵션 맵 */
  const optionMap = useMemo(
      () => ({
        deviceType: deviceTypeOptions,
        netCategory: netAttrOptions,
        netType: netTypeOptions,
        ipType1: ipType1Options,
        ipType2: ipType2Options,
        ipType3: ipType3Options,
        osType: osTypeOptions,
        dbType: dbTypeOptions,

        externalNetYn: EXTERNAL_NET_OPTIONS,
        representYn: REP_OPTIONS,

        vaccineYn: INSTALL_OPTIONS,
        webshellYn: INSTALL_OPTIONS,
        udagentYn: INSTALL_OPTIONS,
        smpagentYn: INSTALL_OPTIONS,

        assetType: ASSET_TYPE_OPTIONS,

        privacyInfoYn: PERSONAL_INFO_OPTIONS,
        tacsYn: ACCEPT_OPTIONS,
        accntMgmtYn: ACCEPT_OPTIONS,
      }),
      [
        deviceTypeOptions,
        netAttrOptions,
        netTypeOptions,
        ipType1Options,
        ipType2Options,
        ipType3Options,
        osTypeOptions,
        dbTypeOptions,
      ]
  );



  // ✅ 페이지 최초 진입 시 필터 옵션 조회
  useEffect(() => {
    let cancelled = false;

    async function fetchFilterOptions() {
      try {
        const res = await httpClient.get("/api/ipbook/filters");
        if (cancelled) return;
        const data = res.data || {};
        console.log("/api/ipbook/filters data", data);

        const toList = (v) => {
          if (!v) return [];
          if (Array.isArray(v)) return v;
          return String(v)
              .split("/")
              .map((s) => s.trim())
              .filter(Boolean);
        };

        const orgList = Array.isArray(data.orgList) ? data.orgList : [];
        if (orgList.length > 0) {
          setOrgTree(orgList);
          setDivisionOptions([ALL, ...orgList.map((o) => o.orgNm)]);
          setHqOptions([ALL]);
          setCenterOptions([ALL]);
          setDeptOptions([ALL]);

          // ✅ 전체 조직 목록 생성 (행추가/수정에서 사용)
          const hqSet = new Set();
          const centerSet = new Set();
          const deptSet = new Set();

          orgList.forEach((divNode) => {
            (divNode.children || []).forEach((hqNode) => {
              if (hqNode?.orgNm) hqSet.add(hqNode.orgNm);

              (hqNode.children || []).forEach((centerNode) => {
                if (centerNode?.orgNm) centerSet.add(centerNode.orgNm);

                (centerNode.children || []).forEach((deptNode) => {
                  if (deptNode?.orgNm) deptSet.add(deptNode.orgNm);
                });
              });
            });
          });

          setAllHqOptions(Array.from(hqSet));
          setAllCenterOptions(Array.from(centerSet));
          setAllDeptOptions(Array.from(deptSet));
        }

        const netCategoryList = toList(data.netCategoryList);
        if (netCategoryList.length > 0) {
          setNetAttrOptions([ALL, ...netCategoryList]);
        }

        const netTypeList = toList(data.netTypeList);
        if (netTypeList.length > 0) {
          setNetTypeOptions([ALL, ...netTypeList]);
        }

        const deviceTypeList = toList(data.deviceTypeList);
        if (deviceTypeList.length > 0) {
          setDeviceTypeOptions([ALL, ...deviceTypeList]);
        }

        const ipType1List = toList(data.ipType1List);
        if (ipType1List.length > 0) {
          setIpType1Options([ALL, ...ipType1List]);
        }

        const ipType2List = toList(data.ipType2List);
        if (ipType2List.length > 0) {
          setIpType2Options([ALL, ...ipType2List]);
        }

        const ipType3List = toList(data.ipType3List);
        if (ipType3List.length > 0) {
          setIpType3Options([ALL, ...ipType3List]);
        }

        const osTypeList = toList(data.osTypeList);
        if (osTypeList.length > 0) {
          setOsTypeOptions([ALL, ...osTypeList]);
        }

        const dbTypeList = toList(data.dbTypeList);
        if (dbTypeList.length > 0) {
          setDbTypeOptions([ALL, ...dbTypeList]);
        }

        setFiltersLoaded(true);
      } catch (err) {
        console.error("[NetworkStatus] failed to fetch /api/ipbook/filters:", err);
      }
    }

    fetchFilterOptions();
    return () => {
      cancelled = true;
    };
  }, []);

  // 조직 트리 기반 옵션 핸들러 (필터용)
  function onChangeDivision(value) {
    setDivision(value);
    setHq(ALL);
    setCenter(ALL);
    setOperationDept(ALL);
    if (value === ALL) {
      setHqOptions([ALL]);
      setCenterOptions([ALL]);
      setDeptOptions([ALL]);
      return;
    }
    const divNode = orgTree.find((d) => d.orgNm === value);
    if (divNode && Array.isArray(divNode.children)) {
      setHqOptions([ALL, ...divNode.children.map((hq) => hq.orgNm)]);
    } else {
      setHqOptions([ALL]);
    }
    setCenterOptions([ALL]);
    setDeptOptions([ALL]);
  }

  function onChangeHq(value) {
    setHq(value);
    setCenter(ALL);
    setOperationDept(ALL);
    if (value === ALL) {
      setCenterOptions([ALL]);
      setDeptOptions([ALL]);
      return;
    }
    const divNode = orgTree.find((d) => d.orgNm === division);
    const hqNode =
        divNode && Array.isArray(divNode.children)
            ? divNode.children.find((hq) => hq.orgNm === value)
            : null;
    if (hqNode && Array.isArray(hqNode.children)) {
      setCenterOptions([ALL, ...hqNode.children.map((center) => center.orgNm)]);
    } else {
      setCenterOptions([ALL]);
    }
    setDeptOptions([ALL]);
  }

  function onChangeCenter(value) {
    setCenter(value);
    setOperationDept(ALL);
    if (value === ALL) {
      setDeptOptions([ALL]);
      return;
    }
    const divNode = orgTree.find((d) => d.orgNm === division);
    const hqNode =
        divNode && Array.isArray(divNode.children)
            ? divNode.children.find((h) => h.orgNm === hq)
            : null;
    const centerNode =
        hqNode && Array.isArray(hqNode.children)
            ? hqNode.children.find((centerObj) => centerObj.orgNm === value)
            : null;
    if (centerNode && Array.isArray(centerNode.children)) {
      setDeptOptions([ALL, ...centerNode.children.map((dept) => dept.orgNm)]);
    } else {
      setDeptOptions([ALL]);
    }
  }

  function onChangeDept(value) {
    setOperationDept(value);
  }

  /** ✅ orgTree에서 본부/센터/부서 코드 찾기 */
  function getOrgCodes(bonbuNm, centerNm, deptNm) {
    let bonbuCd = "";
    let centerCd = "";
    let deptCd = "";

    (orgTree || []).forEach((divNode) => {
      (divNode.children || []).forEach((hqNode) => {
        if (bonbuNm && hqNode.orgNm !== bonbuNm) return;

        if (!bonbuCd && hqNode.orgCd) {
          bonbuCd = hqNode.orgCd;
        }

        (hqNode.children || []).forEach((centerNode) => {
          if (centerNm && centerNode.orgNm !== centerNm) return;

          if (!centerCd && centerNode.orgCd) {
            centerCd = centerNode.orgCd;
          }

          (centerNode.children || []).forEach((deptNode) => {
            if (deptNm && deptNode.orgNm !== deptNm) return;

            if (!deptCd && deptNode.orgCd) {
              deptCd = deptNode.orgCd;
            }
          });
        });
      });
    });

    return { bonbuCd, centerCd, deptCd };
  }

  /** ✅ 조회 실행을 위해 "적용된 필터"를 별도로 관리 */
  const [appliedFilter, setAppliedFilter] = useState(null);

  function mapAssetTypeValue(value) {
    if (!value || value === ALL) return null;

    // ✅ 현재 코드(옵션이 network/server) 대응
    if (value === "network" || value === "server") return value;

    // ✅ 혹시 예전 값(한글)이 섞여 들어오는 경우까지 방어
    if (value === "네트워크") return "network";
    if (value === "서버") return "server";

    return null;
  }

  function buildAppliedFilter() {
    return {
      // 운용부문/본부/센터/부서
      bumunNm: division === ALL ? "" : division,
      bonbuNm: hq === ALL ? "" : hq,
      centerNm: center === ALL ? "" : center,
      deptNm: operationDept === ALL ? "" : operationDept,

      // 자산 유형
      assetType: mapAssetTypeValue(assetType) ?? "",

      // 망속성/망유형/장비유형/OS/DB/ IP유형
      netCategory: normalizeFilter(netAttrFilter),
      netType: normalizeFilter(netTypeFilter),
      deviceType: normalizeFilter(deviceTypeFilter),
      ipType1: normalizeFilter(ipType1Filter),
      ipType2: normalizeFilter(ipType2Filter),
      ipType3: normalizeFilter(ipType3Filter),
      osType: normalizeFilter(osTypeFilter),
      dbType: "", // DB유형 필터는 사용하지 않음

      // 기타
      baseDt: baseDate,
      showIp: !!showIp,
      keyword: normalizeStr(keyword),
    };
  }

  function runSearch({ resetPage = true } = {}) {
    if (!filtersLoaded) return;

    if (resetPage) setPage(1);
    setAppliedFilter(buildAppliedFilter());
  }

  // ✅ 최초 로드(필터 목록 셋팅 완료) 시 자동 1회 조회
  useEffect(() => {
    if (!filtersLoaded) return;
    if (appliedFilter) return;
    runSearch({ resetPage: true });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [filtersLoaded]);

  // ✅ 조회 버튼/자동 트리거로 "적용된 필터"가 바뀌었을 때만 서버 조회
  useEffect(() => {
    if (!filtersLoaded) return;
    if (!appliedFilter) return;

    const payload = {
      filter: appliedFilter,
      sortType: String(sortKey || "수정일자"), // ✅ filter 밖으로 분리
      page: {
        page,
        pagePerPage,
      },
    };

    async function fetchIpRows() {
      try {
        setIsLoading(true);
        console.log("/api/ipbook payload", payload);

        const res = await httpClient.post("/api/ipbook", payload);
        const body = res?.data || {};
        console.log("/api/ipbook raw response", body);

        let list = [];
        let totalCount = 0;

        // ① 상용 서버 스타일: { filter, page, data: [...] }
        if (Array.isArray(body.data)) {
          list = body.data;
          const pageInfo = body.page || {};
          totalCount =
              typeof pageInfo.totalCount === "number" ? pageInfo.totalCount : list.length;
        }
        // ② 예전 mock 스타일: { return: { rows, totalCount, ... } }
        else if (body.return && Array.isArray(body.return.rows)) {
          const ret = body.return;
          list = ret.rows;
          totalCount = typeof ret.totalCount === "number" ? ret.totalCount : list.length;
        }
        // ③ 혹시 { rows: [...] } 형태인 경우까지 방어
        else if (Array.isArray(body.rows)) {
          list = body.rows;
          totalCount = typeof body.totalCount === "number" ? body.totalCount : list.length;
        }

        // ⚠️ 상용 응답에는 id가 없어서 DataTable rowKey용 id를 생성해줌
        const withId = list.map((row, idx) => ({
          ...row,
          id: row.id ?? `${row.ipAddress || row.ip || "row"}-${page}-${idx}`,
        }));

        console.log("/api/ipbook parsed rows", withId);

        setRows(withId);
        setTotalCount(totalCount);
      } catch (err) {
        console.error("[NetworkStatus] failed to fetch /api/ipbook:", err);
      } finally {
        setIsLoading(false);
      }
    }

    fetchIpRows();
  }, [filtersLoaded, appliedFilter, page, pagePerPage, sortKey]);

  const filteredRows = useMemo(() => rows, [rows]);



// ✅ 화면에 표시할 행
  const displayRows = useMemo(() => {
    const controlsRow = { id: "__controls__", __isControlsRow: true };

    if (mode === "add") {
      const draftRow = { ...draft, __isDraft: true, id: "__draft__" };
      return [draftRow, controlsRow, ...rows]; // ✅ 여기
    }

    if (mode === "edit" && editTargetId) {
      const list = [];
      for (const row of rows) { // ✅ 여기
        if (row.id === editTargetId) {
          list.push({ ...draft, __isDraft: true, id: row.id });
          list.push(controlsRow);
        } else {
          list.push(row);
        }
      }
      return list;
    }

    return rows; // ✅ 여기
  }, [mode, draft, rows, editTargetId]);

  // ✅ 페이지네이션 계산 (서버 totalCount 기준)
  const totalPages = useMemo(() => {
    const total = totalCount || 0;
    if (!total) return 1;
    return Math.ceil(total / pagePerPage);
  }, [totalCount, pagePerPage]);

  const canPrevPage = page > 1;
  const canNextPage = page < totalPages;

  const goPrevPage = () => {
    if (!canPrevPage) return;
    setPage((prev) => prev - 1);
  };

  const goNextPage = () => {
    if (!canNextPage) return;
    setPage((prev) => prev + 1);
  };

  /** ✅ 인라인 모드 공통 취소 */
  function cancelInlineEditOrAdd() {
    setMode(null);
    setDraft({});
    setEditTargetId(null);
    setInlineAddTop(null);
  }

  /** ✅ 행 저장 전 필수 입력값만 검증 */
  function validateRowForSave(row) {
    const missingKeys = REQUIRED_KEYS.filter((k) => !normalizeStr(row?.[k]));
    if (missingKeys.length > 0) {
      const missingLabels = missingKeys.map((k) => REQUIRED_KEY_LABELS[k] || k);
      return {
        ok: false,
        message: "모든 항목을 입력해 주세요.",
        // missingLabels,
      };
    }
    return { ok: true };
  }

  /** ✅ 인라인 추가 시작 */
  function beginInlineAdd() {
    if (mode) {
      openAlert("이미 추가/수정 중인 행이 있습니다.");
      return;
    }

    // 정렬/페이지 초기화
    setSortKey("최신");
    setPage(1);

    setMode("add");
    setSelectedId(null);

    // 각 셀렉트에서 '전체'를 제외한 첫 번째 값을 기본값으로 사용
    const firstNetCategory = netAttrOptions.find((o) => o !== ALL) || "";
    const firstNetType = netTypeOptions.find((o) => o !== ALL) || "";
    const firstIpType1 = ipType1Options.find((o) => o !== ALL) || "";
    const firstIpType2 = ipType2Options.find((o) => o !== ALL) || "";
    const firstIpType3 = ipType3Options.find((o) => o !== ALL) || "";
    const firstOsType = osTypeOptions.find((o) => o !== ALL) || "";
    const firstDbType = dbTypeOptions.find((o) => o !== ALL) || "";
    const firstDeviceType = deviceTypeOptions.find((o) => o !== ALL) || "";
    const firstAssetType = ASSET_TYPE_OPTIONS.find((o) => o !== ALL) || "network";

    const defaultYn = "N";

    // 현재 필터에 잡혀 있는 조직명으로 초기값 구성
    const initBonbuNm = hq === ALL ? "" : hq;
    const initCenterNm = center === ALL ? "" : center;
    const initDeptNm = operationDept === ALL ? "" : operationDept;

    // orgTree에서 코드 찾아오기
    const { bonbuCd, centerCd, deptCd } = getOrgCodes(initBonbuNm, initCenterNm, initDeptNm);

    setDraft({
      id: "____",
      assetType: firstAssetType,
      ipAddress: "",
      netCategory: firstNetCategory,
      netType: firstNetType,
      ipType1: firstIpType1,
      ipType2: firstIpType2,
      ipType3: firstIpType3,

      deviceName: "",
      deviceType: firstDeviceType,
      deviceId: "",

      osType: firstOsType,
      osVersion: "",
      dbType: firstDbType,
      dbVersion: "",

      hostName: "",
      hostId: "",
      erpBarcode: "",

      // vaccineYn: defaultYn,
      // webshellYn: defaultYn,
      // udagentYn: defaultYn,
      // smpagentYn: defaultYn,
      privacyInfoYn: defaultYn,
      tacsYn: defaultYn,
      // accntMgmtYn: defaultYn,

      officeNm: "",
      instLocation: "",

      dumunNm: division === ALL ? "" : division,
      bonbuNm: initBonbuNm,
      centerNm: initCenterNm,
      deptNm: initDeptNm,

      bonbuCd: bonbuCd || "",
      centerCd: centerCd || "",
      deptCd: deptCd || "",

      externalNetYn: defaultYn,
      representYn: defaultYn,
    });
  }

  /** ✅ 인라인 수정 시작 (선택된 행을 드래프트로 전환) */
  function beginInlineEdit() {
    if (mode) {
      openAlert("이미 추가/수정 중인 행이 있습니다.");
      return;
    }
    if (!selectedId) {
      openAlert("수정할 행을 먼저 선택해 주세요.");
      return;
    }

    const target = rows.find((r) => r.id === selectedId);
    if (!target) {
      openAlert("선택한 행을 찾을 수 없습니다.");
      return;
    }

    setMode("edit");
    setEditTargetId(selectedId);
    setDraft({ ...target }); // 기존 값으로 인라인 편집
  }

  /** ✅ 행 선택 (추가/수정 모드일 땐 선택 불가) */
  function onSelectRow(rowOrId) {
    if (mode) return; // 행 추가/수정 중에는 선택 안 되게

    const id =
        typeof rowOrId === "string" || typeof rowOrId === "number" ? rowOrId : rowOrId?.id;

    if (!id || id === "__draft__") return;

    setSelectedId((prev) => (prev === id ? null : id));
  }


  /** ✅ 인라인 저장 (추가/수정 공용) */
  async function saveInline() {
    const v = validateRowForSave(draft);

    if (!v.ok) {
      if (Array.isArray(v.missingLabels) && v.missingLabels.length > 0) {
        const listText = v.missingLabels.map((label) => `- ${label}`).join("\n");
        const fullMessage = "필수 항목을 입력해 주세요.\n\n누락 항목:\n" + listText;

        openAlert(fullMessage);
      } else {
        openAlert(v.message);
      }
      return;
    }

    const deptCd = normalizeStr(draft.deptCd);
    const deviceName = normalizeStr(draft.deviceName);
    const ipAddress = normalizeStr(draft.ipAddress);


    if (!deptCd || !deviceName || !ipAddress) {
      openAlert("부서 코드(deptCd), 장비명, IP주소는 필수입니다.");
      return;
    }

    // 공통 path parameter
    const url = `/api/ipbook/${encodeURIComponent(deptCd)}/${encodeURIComponent(
        deviceName
    )}/${encodeURIComponent(ipAddress)}`;

    const payload = {
      ipAddress,
      assetType: draft.assetType || "",
      netType: draft.netType || "",
      deviceId: draft.deviceId || "",
      deviceName,
      deviceType: draft.deviceType || "",
      officeNm: draft.officeNm || "",
      bonbuNm: draft.bonbuNm || "",
      centerNm: draft.centerNm || "",
      deptNm: draft.deptNm || "",

      officeCd: draft.officeCd || "",
      bonbuCd: draft.bonbuCd || "",
      centerCd: draft.centerCd || "",
      deptCd,

      hostId: draft.hostId || "",
      hostName: draft.hostName || "",

      netCategory: draft.netCategory || "",
      externalNetYn: draft.externalNetYn || "N",
      privacyInfoYn: draft.privacyInfoYn || "N",
      tacsYn: draft.tacsYn || "N",
      accntMgmtYn: draft.accntMgmtYn || "N",
      vaccineYn: draft.vaccineYn || "N",
      webshellYn: draft.webshellYn || "N",
      udagentYn: draft.udagentYn || "N",
      smpagentYn: draft.smpagentYn || "N",

      comment: draft.comment || "",
    };

    try {
      if (mode === "add") {
        console.log("IPBOOK ADD url:", url, "payload:", payload);
        const res = await httpClient.post(url, payload);
        const body = res?.data || {};
        const saved = (body.return && body.return.row) || body.row || null;

        const now = new Date().toISOString();
        const rowToInsert =
            saved && saved.id
                ? saved
                : {
                  ...draft,
                  id: uid(),
                  createDt: now,
                  createUser: currentUser.empNo,
                  updateDt: now,
                  updateUser: currentUser.empNo,
                };

        setRows((prev) => [rowToInsert, ...prev]);
        cancelInlineEditOrAdd();
        runSearch({ resetPage: false });
        openAlert("저장되었습니다.");
      } else if (mode === "edit") {
        console.log("IPBOOK UPDATE url:", url, "payload:", payload);
        const res = await httpClient.put(url, payload);
        const body = res?.data || {};
        const saved = (body.return && body.return.row) || body.row || null;
        const now = new Date().toISOString();

        setRows((prev) =>
            prev.map((r) => {
              if (r.id !== draft.id) return r;

              if (saved) {
                return {
                  ...r,
                  ...saved,
                  id: r.id,
                };
              }

              return {
                ...r,
                ...draft,
                updateDt: now,
                updateUser: currentUser.empNo,
              };
            })
        );

        cancelInlineEditOrAdd();
        runSearch({ resetPage: false });
        openAlert("수정되었습니다.");
      }
    } catch (err) {
      console.error("[NetworkStatus] failed to save /api/ipbook:", err);

      const status = err?.response?.status;

      // ✅ 중복 (409 Conflict)
      if (mode === "add" && status === 409) {
        openAlert(
            "중복된 항목이 존재합니다.\n" +
            "중복 여부는 'IP', '장비명', '운용부서' 컬럼을 기준으로 식별 및 관리됩니다."
        );
        return;
      }

      // 그 외 오류
      openAlert("저장 중 오류가 발생했습니다.");
    }
  }

  async function handleExcelDownload() {
    // ✅ 조회와 동일한 필터로 다운로드
    if (!filtersLoaded) {
      openAlert("필터 목록이 아직 로드되지 않았습니다.");
      return;
    }

    const filter = appliedFilter || buildAppliedFilter();

    // 다운로드는 보통 전체가 필요하니 pagePerPage를 충분히 크게
    const payload = {
      filter,
      sortType: String(sortKey || "수정일자"), // ✅ filter 밖으로 분리
      page: {
        page: 1,
        pagePerPage: 1000000,
      },
    };

    try {
      const res = await httpClient.post("/api/ipbook/download", payload, {
        responseType: "blob",
      });

      // 파일명은 서버 헤더(Content-Disposition) 우선, 없으면 기본값
      const contentDisposition = res?.headers?.["content-disposition"] || "";
      const match = contentDisposition.match(/filename\*=UTF-8''([^;]+)|filename="([^"]+)"/i);
      const serverFileName = decodeURIComponent(match?.[1] || match?.[2] || "");
      const filename = serverFileName || "NET-IP_다운로드.xlsx";

      const blob = new Blob([res.data], {
        type:
            res?.headers?.["content-type"] ||
            "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
      });

      const url = window.URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = filename;
      document.body.appendChild(a);
      a.click();
      a.remove();
      window.URL.revokeObjectURL(url);
    } catch (err) {
      console.error("[NetworkStatus] /api/ipbook/download error:", err);

      const status = err?.response?.status;
      if (status === 400) {
        openAlert("다운로드 요청 값이 올바르지 않습니다.");
        return;
      }

      openAlert("엑셀 다운로드 중 오류가 발생했습니다.");
    }
  }

  function handleExcelUpload(type) {
    if (mode) {
      openAlert("이미 추가/수정 중인 행이 있습니다.");
      return;
    }
    setUploadType(type);
    if (fileRef.current) fileRef.current.click();
  }

  async function handleFileSelected(file) {
    if (!file) return;

    try {
      const formData = new FormData();
      formData.append("file", file);

      // 선택된 타입에 따라 URL 결정
      const url = uploadType === "network"
          ? "/api/ipbook/network/upload"
          : "/api/ipbook/server/upload";
      const res = await httpClient.post(url, formData);
      const data = res?.data || {};

      const insertedCount = data.insertedCount ?? 0;
      const validationFailCount = data.validationFailCount ?? 0;
      const duplicateCount = data.duplicateCount ?? 0;
      const errorFileBase64 = data.errorFileBase64;
      const errorFileName = data.errorFileName || "error.xlsx";

      const hasErrorFile =
          errorFileBase64 !== null &&
          errorFileBase64 !== undefined &&
          String(errorFileBase64).trim() !== "";

      if (!hasErrorFile) {
        openAlert(`엑셀 업로드 ${insertedCount} 건이 완료 되었습니다.`);
      } else {
        const parts = [];
        if (duplicateCount > 0) parts.push(`중복 ${duplicateCount}건`);
        if (validationFailCount > 0) parts.push(`오류 ${validationFailCount}건`);

        const reasonText = parts.length ? ` (${parts.join(", ")})` : "";
        const message =
            `엑셀 업로드를 실패하였습니다.${reasonText}\n` +
            `상세 사유가 포함된 파일을 다운로드합니다.`;

        openAlert(message);
        downloadBase64File(String(errorFileBase64), errorFileName);
      }

      // ✅ 업로드 처리 후 자동 1회 조회
      runSearch({ resetPage: false });
    } catch (e) {
      console.error("[NetworkStatus] /api/ipbook/upload error:", e);
      openAlert("엑셀 업로드 중 오류가 발생했습니다.");
    } finally {
      setUploadType(null); // 타입 초기화
      if (fileRef.current) fileRef.current.value = "";
    }
  }

  /** ✅ DataTable 컬럼 정의 */
  const columns = useMemo(() => {
    const selectKeys = new Set([
      // "deviceType",
      "netCategory",
      "netType",
      "externalNetYn",
      "ipType1",
      "ipType2",
      "ipType3",
      "osType",
      "dbType",
      "representYn",
      "vaccineYn",
      "webshellYn",
      "udagentYn",
      "smpagentYn",
      "privacyInfoYn",
      "tacsYn",
      "accntMgmtYn",
      "bonbuNm",
      "centerNm",
      "deptNm",
      // "dumunNm",
        "assetType",
    ]);

    return columnDefs.map((def) => {
      const isSelectKey = selectKeys.has(def.key);

      return {
        key: def.key,
        label: def.label,
        sticky: def.sticky,
        headerGrey: def.headerGrey,
        tdClassName: (row) => {
          if (!row?.__isDraft) return "";
          const classes = [];
          if (REQUIRED_KEYS.includes(def.key)) {
            classes.push("is-requiredCell");
          }
          classes.push("is-draftCell");
          return classes.join(" ");
        },
        render: (row) => {

          // ✅ 저장/취소 버튼 행
          if (row?.__isControlsRow) {
            // 첫 컬럼(왼쪽 첫 셀)에만 버튼을 그리고 나머지는 빈칸
            if (def.key !== columnDefs[0].key) return "";

            return (
                <div className="tableInlineControls">
                  <Button variant="excel" onClick={saveInline}>
                    저장
                  </Button>
                  <Button variant="ghost" onClick={cancelInlineEditOrAdd}>
                    취소
                  </Button>
                </div>
            );
          }

          const isDraft = row?.__isDraft;

          // 메타 컬럼은 draft에서 "-" 고정
          if (
              isDraft &&
              ["createDt", "createUser", "updateDt", "updateUser"].includes(def.key)
          ) {
            return "-";
          }

          // ✅ 드래프트 행: 모드별 editable 여부 결정
          if (isDraft) {
            const isAddMode = mode === "add";
            const isEditMode = mode === "edit";
            let editable = false;

            if (isAddMode && ADD_EDITABLE_KEYS.has(def.key)) {
              editable = true;
            }
            if (isEditMode && EDIT_EDITABLE_KEYS.has(def.key)) {
              editable = true;
            }

            // 수정 불가 필드는 값만 표시
            if (!editable) {
              return String(draft?.[def.key] ?? "");
            }

            // --- 본부(bonbuNm) (추가 모드에서만 editable 셋에 포함됨) ---
            if (isSelectKey && def.key === "bonbuNm") {
              const opts = allHqOptions;
              const value = draft?.bonbuNm ?? "";
              return (
                  <select
                      className="table__inlineSelect"
                      value={value}
                      onChange={(e) => {
                        const newBonbuNm = e.target.value;
                        const { bonbuCd } = getOrgCodes(newBonbuNm, "", "");
                        setDraft((prev) => ({
                          ...prev,
                          bonbuNm: newBonbuNm,
                          bonbuCd: bonbuCd || "",
                          centerNm: "",
                          centerCd: "",
                          deptNm: "",
                          deptCd: "",
                        }));
                      }}
                  >
                    <option value="">선택</option>
                    {opts.map((o) => (
                        <option key={o} value={o}>
                          {o}
                        </option>
                    ))}
                  </select>
              );
            }

            // --- 센터(centerNm) (추가 모드에서만 editable 셋에 포함됨) ---
            if (isSelectKey && def.key === "centerNm") {
              const hqName = draft?.bonbuNm || "";
              const centers = getCenterOptionsFromOrgTree(orgTree, hqName, allCenterOptions);
              const value = draft?.centerNm ?? "";
              return (
                  <select
                      className="table__inlineSelect"
                      value={value}
                      onChange={(e) => {
                        const newCenterNm = e.target.value;
                        const { bonbuCd, centerCd } = getOrgCodes(draft?.bonbuNm || "", newCenterNm, "");
                        setDraft((prev) => ({
                          ...prev,
                          centerNm: newCenterNm,
                          bonbuCd: bonbuCd || prev.bonbuCd || "",
                          centerCd: centerCd || "",
                          deptNm: "",
                          deptCd: "",
                        }));
                      }}
                  >
                    <option value="">선택</option>
                    {centers.map((o) => (
                        <option key={o} value={o}>
                          {o}
                        </option>
                    ))}
                  </select>
              );
            }

            // --- 부서(deptNm) (추가 모드에서만 editable 셋에 포함됨) ---
            if (isSelectKey && def.key === "deptNm") {
              const hqName = draft?.bonbuNm || "";
              const centerName = draft?.centerNm || "";
              const depts = getDeptOptionsFromOrgTree(orgTree, hqName, centerName, allDeptOptions);
              const value = draft?.deptNm ?? "";
              return (
                  <select
                      className="table__inlineSelect"
                      value={value}
                      onChange={(e) => {
                        const newDeptNm = e.target.value;
                        const { bonbuCd, centerCd, deptCd } = getOrgCodes(
                            draft?.bonbuNm || "",
                            draft?.centerNm || "",
                            newDeptNm
                        );
                        setDraft((prev) => ({
                          ...prev,
                          deptNm: newDeptNm,
                          bonbuCd: bonbuCd || prev.bonbuCd || "",
                          centerCd: centerCd || prev.centerCd || "",
                          deptCd: deptCd || "",
                        }));
                      }}
                  >
                    <option value="">선택</option>
                    {depts.map((o) => (
                        <option key={o} value={o}>
                          {o}
                        </option>
                    ))}
                  </select>
              );
            }

            // --- 나머지 select 컬럼 ---
            if (isSelectKey) {
              const rawOpts = optionMap[def.key] ?? [];

              const noAllKeys = new Set([
                "netCategory",
                "netType",
                "ipType1",
                "ipType2",
                "ipType3",
                "osType",
                "dbType",
                "deviceType",
                  "assetType"
              ]);

              const opts = noAllKeys.has(def.key) ? rawOpts.filter((o) => o !== ALL) : rawOpts;

              const value = draft?.[def.key] ?? "";
              return (
                  <select
                      className="table__inlineSelect"
                      value={value}
                      onChange={(e) =>
                          setDraft((prev) => ({
                            ...prev,
                            [def.key]: e.target.value,
                          }))
                      }
                  >
                    {opts.map((o) => (
                        <option key={o} value={o}>
                          {o}
                        </option>
                    ))}
                  </select>
              );
            }

            // --- 입력 컬럼(텍스트 인풋) ---
            const value = draft?.[def.key] ?? "";
            return (
                <input
                    className="table__inlineInput"
                    value={value}
                    onChange={(e) =>
                        setDraft((prev) => ({
                          ...prev,
                          [def.key]: e.target.value,
                        }))
                    }
                />
            );
          }

          // ✅ 일반 행 출력
          if (def.key === "ipAddress") {
            return String(row?.ipAddress ?? "");
          }

          return String(row?.[def.key] ?? "");
        },
      };
    });
  }, [
    optionMap,
    draft,
    orgTree,
    allHqOptions,
    allCenterOptions,
    allDeptOptions,
    mode,
  ]);


  useEffect(() => {
    const calc = () => {
      const scrollEl = tableScrollRef.current;
      if (!scrollEl) return;

// ✅ 하단바는 “테이블 가로 스크롤 영역” 폭/위치에 맞춤
      const rect = scrollEl.getBoundingClientRect();
      setHScrollDock({
        left: rect.left,
        width: rect.width,
        visible: true,
      });

      // 2) 스페이서는 "테이블 스크롤 컨테이너의 scrollWidth"로 맞춤 (✅ 끝까지 가게 핵심)
      const contentW = scrollEl.scrollWidth || 1;
      setScrollSpacerWidth(contentW);
    };

    // 렌더 직후에 안정적으로 계산
    const raf1 = requestAnimationFrame(() => {
      requestAnimationFrame(calc);
    });

    window.addEventListener("resize", calc);
    return () => {
      cancelAnimationFrame(raf1);
      window.removeEventListener("resize", calc);
    };
  }, [displayRows]);


  // ✅ 테이블 크기 및 스크롤 범위 동기화 로직
  useEffect(() => {
    const tableEl = tableScrollRef.current;
    if (!tableEl) return;

    // 테이블의 크기나 위치가 변할 때마다 실행될 함수
    const updateLayout = () => {
      const rect = tableEl.getBoundingClientRect();
      setHScrollLayout({ left: rect.left, width: rect.width }); // 화면상 실제 위치와 너비
      setScrollSpacerWidth(tableEl.scrollWidth); // 테이블 내부의 실제 전체 가로 길이
    };

    // 1. ResizeObserver로 테이블 크기 변화 감지 (컬럼 너비 변경 등 대응)
    const ro = new ResizeObserver(updateLayout);
    ro.observe(tableEl);

    // 2. 초기 실행 및 윈도우 리사이즈 대응
    updateLayout();
    window.addEventListener("resize", updateLayout);

    return () => {
      ro.disconnect();
      window.removeEventListener("resize", updateLayout);
    };
  }, [rows, mode]); // 데이터가 바뀌거나 편집 모드가 될 때 다시 계산


  /** ✅ draft 행 기준으로 저장/취소 버튼 세로 위치 계산 */
  useEffect(() => {
    if (!mode) return;
    const cardEl = tableCardRef.current;
    if (!cardEl) return;

    const draftCell = cardEl.querySelector(".is-draftCell");
    if (!draftCell) return;

    const draftRow = draftCell.closest("tr");
    if (!draftRow) return;

    const cardRect = cardEl.getBoundingClientRect();
    const rowRect = draftRow.getBoundingClientRect();

    const offsetTop = rowRect.top + rowRect.height / 2 - cardRect.top;
    setInlineAddTop(offsetTop);
  }, [mode, displayRows, page, pagePerPage]);

  return (
      <div className="networkPage">
        <div className="networkPage__filtersCard">
          <div className="networkPage__filters">
            <div className="filtersGrid">
              {/* ✅ 필터 순서: 운용부문/본부/센터/부서 */}
              <SelectField label="운용부문" value={division} onChange={onChangeDivision} options={divisionOptions} />
              <SelectField label="운용본부" value={hq} onChange={onChangeHq} options={hqOptions} />
              <SelectField label="운용센터" value={center} onChange={onChangeCenter} options={centerOptions} />
              <SelectField label="운용부서" value={operationDept} onChange={onChangeDept} options={deptOptions} />

              {/* 망속성, 망유형, IP유형1/2/3, 장비유형, OS유형, 자산유형 */}
              <SelectField label="망속성" value={netAttrFilter} onChange={setNetAttrFilter} options={netAttrOptions} />
              <SelectField label="망유형" value={netTypeFilter} onChange={setNetTypeFilter} options={netTypeOptions} />
              <SelectField label="IP유형1" value={ipType1Filter} onChange={setIpType1Filter} options={ipType1Options} />
              <SelectField label="IP유형2" value={ipType2Filter} onChange={setIpType2Filter} options={ipType2Options} />
              <SelectField label="IP유형3" value={ipType3Filter} onChange={setIpType3Filter} options={ipType3Options} />
              {/*<SelectField label="장비유형" value={deviceTypeFilter} onChange={setDeviceTypeFilter} options={deviceTypeOptions} />*/}
              {/*<SelectField label="OS유형" value={osTypeFilter} onChange={setOsTypeFilter} options={osTypeOptions} />*/}
              <SelectField
                  label="자산유형"
                  value={assetType}
                  onChange={setAssetType}
                  options={ASSET_TYPE_OPTIONS}
              />

              {/* 기준날짜 */}
              <DateField label="기준날짜" value={baseDate} onChange={setBaseDate} />

              {/* IP표시 */}
              {/* IP표시 - 클릭 영역 제한을 위해 structure 변경 */}
              <div className="field ip-display-field">
                <span className="field__label">IP 표시</span>
                <div className="field__control-checkbox">
                  <input
                      type="checkbox"
                      checked={showIp}
                      onChange={(e) => setShowIp(e.target.checked)}
                  />
                </div>
              </div>

              {/* 키워드 + 조회 버튼 */}
              <div className="filtersGrid__keyword">
                <div className="filtersGrid__keywordRow">
                  <InputField
                      label="키워드"
                      placeholder="IP / 장비명 / 설비바코드(ERP) / 장비ID(NMS) / 생성자ID"
                      value={keyword}
                      onChange={setKeyword}
                      className="keywordInput"
                      onKeyDown={(e) => {
                        if (e.key === 'Enter') {
                          runSearch({ resetPage: true });
                        }
                      }}
                  />
                  <Button variant="search" onClick={() => runSearch({ resetPage: true })}>
                    조회 🔍
                  </Button>
                </div>
              </div>
            </div>
          </div>
        </div>

        <div className="networkPage__tableCard" ref={tableCardRef}>

          <div className="networkPage__table">
            <CardHeader
                left={
                  <div className="tableHeaderLeft">
                <span className="tableHeaderLeft__count">
                  조회 IP수 <strong>{(totalCount || rows.length).toLocaleString()}</strong> 건
                </span>
                  </div>
                }
                right={
                  <div className="tableHeaderRight">
                    <div className="tableSortWrap">
                      <SelectField
                          label="정렬"
                          value={sortKey}
                          onChange={(v) => {
                            setSortKey(v);
                            setPage(1);                 // ✅ 정렬 바꾸면 1페이지로
                          }}
                          options={SORT_OPTIONS}
                          minWidth={120}
                      />
                    </div>

                    <Button variant="add" onClick={beginInlineAdd} disabled={!!mode}>
                      추가 ＋
                    </Button>

                    <Button variant="edit" onClick={beginInlineEdit} disabled={!!mode}>
                      수정 ✎
                    </Button>

                    <Button variant="excel" onClick={handleExcelDownload}>
                      엑셀 다운로드 ↓
                    </Button>
                    <Button variant="excel" onClick={() => handleExcelUpload("network")}>
                      엑셀 업로드 (네트워크) ↑
                    </Button>
                    <Button variant="excel" onClick={() => handleExcelUpload("server")}>
                      엑셀 업로드 (서버) ↑
                    </Button>

                    <input
                        ref={fileRef}
                        type="file"
                        accept=".xlsx,.xls"
                        style={{display: "none"}}
                        onChange={(e) => handleFileSelected(e.target.files?.[0])}
                    />
                  </div>
                }
            />
          </div>

          <div className="networkPage__tableBody">
            <div
                className="networkPage__tableScroll"
                ref={tableScrollRef}
                onScroll={(e) => {
                  if (syncingRef.current) return;
                  syncingRef.current = true;
                  if (hScrollRef.current) {
                    hScrollRef.current.scrollLeft = e.currentTarget.scrollLeft;
                  }
                  syncingRef.current = false;
                }}
            >
              <div className="networkPage__tableScrollInner">
                <DataTable
                    columns={columns}
                    rows={displayRows}
                    rowKey="id"
                    selectedId={selectedId}
                    onSelect={(row) => {
                      if (mode) return;
                      onSelectRow(row);
                    }}
                />
              </div>
            </div>

            {/* ✅ 항상 보이는 “전용 가로 스크롤바” */}
            <div
                className="networkPage__hScroll"
                ref={hScrollRef}
                style={{
                  left: hScrollLayout.left,   // 테이블의 시작 위치와 맞춤
                  width: hScrollLayout.width, // 테이블의 너비와 맞춤
                }}
                onScroll={(e) => {
                  if (syncingRef.current) return;
                  syncingRef.current = true;
                  if (tableScrollRef.current) {
                    tableScrollRef.current.scrollLeft = e.currentTarget.scrollLeft;
                  }
                  syncingRef.current = false;
                }}
            >
              <div
                  className="networkPage__hScrollSpacer"
                  style={{width: `${scrollSpacerWidth}px`}} // 테이블의 실제 scrollWidth와 1:1 매칭
              />
            </div>
          </div>

          <div className="networkPage__pagination">
            <Button variant="ghost" onClick={goPrevPage} disabled={!canPrevPage}>
            ◀ 이전
            </Button>

            <span className="networkPage__paginationInfo">
    {page} / {totalPages} 페이지 (페이지당 {pagePerPage}건)
  </span>

            <Button variant="ghost" onClick={goNextPage} disabled={!canNextPage}>
              다음 ▶
            </Button>
          </div>
        </div>

        <AlertPopup open={alertOpen} title={alertTitle} message={alertMessage} onClose={() => setAlertOpen(false)}/>
      </div>
  );
}