import "../../styles/card.css";

export default function CardHeader({ left, right }){
  return (
    <div className="cardHeader">
      <div className="cardHeader__left">{left}</div>
      <div className="cardHeader__right">{right}</div>
    </div>
  );
}
