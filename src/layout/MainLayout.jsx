import { Outlet } from "react-router-dom";
import Sidebar from "../shared/Sidebar.jsx";
import TopContextBar from "../shared/TopContextBar.jsx";
import "../styles/layout.css";

export default function MainLayout(){
  return (
    <div className="layout">
      <Sidebar />
      <div className="layout__main">
        <TopContextBar />
        <div className="layout__content">
          <div className="container">
            <Outlet />
          </div>
        </div>
      </div>
    </div>
  );
}
