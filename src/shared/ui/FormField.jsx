import "../../styles/form.css";

export default function FormField({ label, required, children }){
  return (
    <div className="formField">
      <div className="formField__label">
        <span>{label}</span>
        {required ? <span className="formField__req">*</span> : null}
      </div>
      <div className="formField__control">{children}</div>
    </div>
  );
}
