import { EVENT } from "../config";
import { MailIcon, PhoneIcon } from "./Icons";

const Footer = () => (
  <footer className="footer">
    <div className="container footer__inner">
      <div>
        <p className="footer__brand">
          <span className="outline">FIT</span> COMBAT
        </p>
        <p className="muted">Discipline · Focus · Endurance · Results</p>
      </div>
      <div className="footer__contact">
        <a href={`tel:${EVENT.phone}`}>
          <PhoneIcon width={18} height={18} /> {EVENT.phone}
        </a>
        <a href={`mailto:${EVENT.email}`}>
          <MailIcon width={18} height={18} /> {EVENT.email}
        </a>
      </div>
    </div>
    <p className="footer__copy">© 2026 FIT COMBAT Challenge Zone. All rights reserved.</p>
  </footer>
);

export default Footer;
