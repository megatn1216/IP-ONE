import "../../styles/button.css";

export default function Button({ variant = "default", children, icon, className = "", ...rest }){
  return (
    <button className={`btn btn--${variant} ${className}`} {...rest}>
      <span className="btn__label">{children}</span>
      {icon ? <span className="btn__icon">{icon}</span> : null}
    </button>
  );
}
