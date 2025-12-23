import "../../styles/fields.css";

export default function DateField({ label, value, onChange }){
  return (
    <label className="field">
      <span className="field__label">{label}</span>
      <input
        type="date"
        className="field__control"
        value={value}
        onChange={(e)=>onChange?.(e.target.value)}
      />
    </label>
  );
}
