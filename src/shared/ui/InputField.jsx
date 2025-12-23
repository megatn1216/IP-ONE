import "../../styles/fields.css";

export default function InputField({ label, value, onChange, placeholder, icon, type = "text", autoComplete }){
  return (
    <label className="field">
      <span className="field__label">{label}</span>
      <span className="field__inputWrap">
        <input
          className="field__control field__input"
          type={type}
          value={value}
          onChange={(e)=>onChange?.(e.target.value)}
          placeholder={placeholder}
          autoComplete={autoComplete}
        />
        {icon ? <span className="field__icon">{icon}</span> : null}
      </span>
    </label>
  );
}
