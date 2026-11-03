function TypingInstructions({ onStart }) {
  return (
    <section className="card">
      <h1>Typing Assessment</h1>
      <p>Type the sentence shown below as naturally and accurately as possible.</p>
      <ul>
        <li>Use your normal typing style.</li>
        <li>Do not intentionally type faster or slower.</li>
        <li>Try to minimize mistakes.</li>
        <li>Keep your hands on the keyboard during the test.</li>
        <li>Complete the sentence from beginning to end.</li>
        <li>The assessment records keyboard timing information for research screening.</li>
      </ul>
      <button type="button" className="primary action-button" onClick={onStart}>
        Start Test
      </button>
    </section>
  );
}

export default TypingInstructions;
