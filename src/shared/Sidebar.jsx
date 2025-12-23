import { NavLink, useNavigate } from "react-router-dom";
import { useAuth } from "../auth/AuthContext.jsx";
import markWhite from "../assets/ip-one-mark-white.png";
import "../styles/sidebar.css";

function Icon({ children }) {
  return <span className="sidebar__icon">{children}</span>;
}

export default function Sidebar() {
  const navigate = useNavigate();
  const { user, logout } = useAuth();

  const handleLogout = async () => {
    const ok = window.confirm("로그아웃하시겠습니까?");
    if (!ok) return;
    await logout();
    navigate("/login", { replace: true });
  };

  const userLabel = user?.name || user?.loginId || "사용자";

  return (
    <aside className="sidebar">
      <div className="sidebar__brand">
        <div className="sidebar__brandMark" aria-label="IP-ONE">
          <img className="sidebar__brandMarkImg" src={markWhite} alt="IP-ONE" />
        </div>
        <div className="sidebar__brandText">IP-ONE</div>
      </div>

      <div className="sidebar__group">
        <div className="sidebar__groupTitle">현황관리</div>
        <div className="sidebar__items">
          <NavLink
            to="/status/network"
            className={({ isActive }) =>
              "sidebar__item" + (isActive ? " is-active" : "")
            }
          >
            <Icon>🌐</Icon>
            <span>IP 자산 현황 관리</span>
          </NavLink>
          {/*<NavLink*/}
          {/*  to="/status/server"*/}
          {/*  className={({ isActive }) =>*/}
          {/*    "sidebar__item" + (isActive ? " is-active" : "")*/}
          {/*  }*/}
          {/*>*/}
          {/*  <Icon>🗄</Icon>*/}
          {/*  <span>서버</span>*/}
          {/*</NavLink>*/}
        </div>
      </div>

      <div className="sidebar__group">
        <div className="sidebar__groupTitle">모니터링</div>
        <div className="sidebar__items">
          <NavLink
            to="/monitoring"
            className={({ isActive }) =>
              "sidebar__item" + (isActive ? " is-active" : "")
            }
          >
            <Icon>📈</Icon>
            <span>IP 자산 모니터링</span>
          </NavLink>
        </div>
      </div>

      <div className="sidebar__footer">
        <div className="sidebar__avatar">👤</div>
        <button type="button" className="sidebar__userName" onClick={handleLogout}>
          {userLabel}
        </button>
      </div>
    </aside>
  );
}
