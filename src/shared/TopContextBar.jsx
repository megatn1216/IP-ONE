import { useMemo } from "react";
import { useLocation } from "react-router-dom";
import "../styles/topbar.css";

function pageTitle(pathname){
  if (pathname.startsWith("/status/network")) return "IP 자산 현황 관리";
  // if (pathname.startsWith("/status/server")) return "서버 IP 현황 관리";
  if (pathname.startsWith("/monitoring")) return "IP 자산 모니터링";
  return "NET-IP";
}

export default function TopContextBar(){
  const { pathname } = useLocation();
  const title = useMemo(() => pageTitle(pathname), [pathname]);

  return (
    <div className="topbar">
      <div className="container topbar__inner">
        <div className="topbar__title">{title}</div>
      </div>
    </div>
  );
}
