// generate-ipbook-data.js
import fs from "fs";
import path from "path";
import { fileURLToPath } from "url";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

function buildDummyIpRows(count) {
    const now = Date.now();
    const rows = [];
    for (let i = 1; i <= count; i++) {
        const createdAt = new Date(now - i * 86400000).toISOString();
        rows.push({
            id: `row-${i}`,
            ip: `10.81.${Math.floor(i / 2)}.${100 + i}`,
            netAttr: ["무선", "IP", "전송", "보안"][i % 4],
            netType1: ["무선코어망", "코넷망", "프리미엄망"][i % 3],
            netType2: ["제어", "IMS", "DU", "VPN망", "-"][i % 5],
            ktLink: ["미연동", "연동", "-"][i % 3],
            ipType1: ["공인", "사설", "-"][i % 3],
            ipType2: ["고정", "유동", "-"][i % 3],
            rep: ["O", "X", "-"][i % 3],
            ipType3: ["무선코어망", "무선코넷망", "-"][i % 3],

            osType: ["리눅스", "유닉스", "윈도우", "-"][i % 4],
            osVer: ["CentOS 7.7.1908", "CentOS 7.8.2003", "-"][i % 3],
            dbType: ["PostgreSQL", "MariaDB", "-"][i % 3],
            dbVer: ["13.19", "12.1.12", "-"][i % 3],
            stdSvcCode: i % 2 ? "70020" : "70030",
            unitSvcCode: i % 2 ? "A001" : "B002",
            hostId: i % 2 ? "123456781238" : "",
            vaccine: ["설치", "미설치", "-"][i % 3],
            webshell: ["설치", "미설치", "-"][i % 3],
            udAgent: ["설치", "미설치", "-"][i % 3],
            smpAgent: ["설치", "미설치", "-"][i % 3],
            edr: ["설치", "미설치", "-"][i % 3],
            personalInfo: ["보유", "미보유", "-"][i % 3],
            tacs: ["수용", "미수용", "-"][i % 3],
            accountSystem: ["수용", "미수용", "-"][i % 3],

            deviceName: i % 2 ? "N.Daeg-ECA176E" : "N.Seo-ECA100A",
            deviceType: ["라우터", "스위치", "서버", "기타"][i % 4],
            station: ["서대문", "인천", "대전", "-"][i % 4],
            installLoc: ["1층", "2층", "Rack-3", "-"][i % 4],
            hq: ["수도권", "중부", "남부"][i % 3],
            center: ["서부국제운용센터", "동부국제운용센터"][i % 2],
            dept: ["서울IP운용부", "인천IP운용부", "경기IP운용부"][i % 3],
            svcType: ["IMS", "DU", "-"][i % 3],
            facilityBarcode: i % 2 ? `ERP-00${i}` : "",
            deviceIdErp: i % 2 ? `D-10${i}` : "",
            deviceIdNms: i % 2 ? `NMS-90${i}` : "",

            createdAt,
            createdBy: "10000000",
            updatedAt: createdAt,
            updatedBy: "10000000",
        });
    }
    return rows;
}

const rows = buildDummyIpRows(1070);
const outPath = path.join(__dirname, "ipbook-data.json");

fs.writeFileSync(outPath, JSON.stringify(rows, null, 2), "utf-8");
console.log(`ipbook-data.json 생성 완료: ${outPath} (rows=${rows.length})`);