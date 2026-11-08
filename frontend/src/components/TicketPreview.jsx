import ticketSample from "../assets/ticket-sample.jpg";

// Picture of the real ticket design (generated from the same code that makes the PDFs).
const TicketPreview = () => (
  <figure className="ticket-sample">
    <img src={ticketSample} alt="Sample FIT COMBAT ticket" loading="lazy" />
    <figcaption>
      Sample ticket — yours arrives by email as a PDF with your own name and
      number.
    </figcaption>
  </figure>
);

export default TicketPreview;
