import "../../styles/modal.css";
import Button from "./Button.jsx";

export default function Modal({ title, open, onClose, onSubmit, submitLabel = "저장", children, disableSubmit }){
  if (!open) return null;

  return (
    <div className="modalBackdrop" onClick={onClose}>
      <div className="modal" onClick={(e)=>e.stopPropagation()}>
        <div className="modal__header">
          <div className="modal__title">{title}</div>
          <button className="modal__close" onClick={onClose} aria-label="close">×</button>
        </div>
        <div className="modal__body">{children}</div>
        <div className="modal__footer">
          <Button variant="ghost" onClick={onClose}>취소</Button>
          <Button variant="excel" onClick={onSubmit} disabled={disableSubmit}>{submitLabel}</Button>
        </div>
      </div>
    </div>
  );
}
