import "../../styles/modal.css";
import Button from "./Button.jsx";

export default function AlertPopup({ open, title = "알림", message, onClose }){
  if (!open) return null;

  return (
    <div className="modalBackdrop" onClick={onClose}>
      <div className="modal modal--alert" onClick={(e)=>e.stopPropagation()}>
        <div className="modal__header">
          <div className="modal__title">{title}</div>
          <button className="modal__close" onClick={onClose} aria-label="close">×</button>
        </div>
        <div className="modal__body">
          <div style={{ fontSize: "var(--fs-12)", color: "var(--color-text-secondary)", lineHeight: 1.55, paddingBottom: 6 }}>
            {message}
          </div>
        </div>
        <div className="modal__footer">
          <Button variant="excel" onClick={onClose}>확인</Button>
        </div>
      </div>
    </div>
  );
}
