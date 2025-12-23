import "../../styles/fields.css";

export default function SelectField({ label, value, onChange, options, minWidth }){
  return (
    <label className="field">
      <span className="field__label">{label}</span>
      <select
        className="field__control"
        style={minWidth ? { minWidth } : undefined}
        value={value}
        onChange={(e)=>onChange?.(e.target.value)}
      >
        {/*{options.map(op => <option key={op} value={op}>{op}</option>)}*/}
          {options.map((opt, idx) => (
              <option key={`${opt}-${idx}`} value={opt}>
                  {opt}
              </option>
          ))}
      </select>
    </label>
  );
}
