export default function Intro({ close }: { close: () => void }) {
  return (
    <div className="intro">
      <button onClick={close}>Skip intro →</button>
      <div className="stars" />
      <div
        className="intro-moon"
        style={{ backgroundImage: "url('/images/moon_exploration.jpg')" }}
        title="Lunar Exploration Target"
      />
      <div className="earth">
        <span />
      </div>
      <p>MISSION CONTROL</p>
      <h1>Humanity, in motion.</h1>
    </div>
  );
}
