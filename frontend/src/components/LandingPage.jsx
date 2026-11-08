import heroImage from "../assets/fitcombat-hero.jpg";
import { EVENT, formatNaira } from "../config";
import Countdown from "./Countdown";
import Footer from "./Footer";
import {
  BoltIcon,
  CalendarIcon,
  ClockIcon,
  DumbbellIcon,
  MountainIcon,
  PinIcon,
  TargetIcon,
  TicketIcon,
} from "./Icons";
import TicketForm from "./TicketForm";
import TicketPreview from "./TicketPreview";

const pillars = [
  { label: "Discipline", Icon: DumbbellIcon },
  { label: "Focus", Icon: TargetIcon },
  { label: "Endurance", Icon: BoltIcon },
  { label: "Results", Icon: MountainIcon },
];

const steps = [
  ["Enter your details", "Your name and the email your ticket should go to."],
  ["Pay securely", "Card, bank transfer or USSD through Paystack."],
  ["Get your ticket", "A PDF with your unique ticket number lands in your inbox."],
];

const LandingPage = () => (
  <div className="page">
    {/* ---------- Nav ---------- */}
    <nav className="nav">
      <div className="container nav__inner">
        <a href="#top" className="nav__brand">
          <BoltIcon width={20} height={20} className="nav__bolt" /> FIT COMBAT
        </a>
        <a href="#tickets" className="btn btn--gold btn--sm">
          Get ticket
        </a>
      </div>
    </nav>

    {/* ---------- Hero ---------- */}
    <header className="hero" id="top">
      <div className="hero__media">
        <img src={heroImage} alt="Two athletes in a gym — FIT COMBAT Challenge Zone" />
      </div>

      <div className="container hero__content">
        <p className="eyebrow">
          {EVENT.dateShort} &nbsp;•&nbsp; Lekki, Lagos
        </p>
        <h1 className="hero__title">
          <span className="hero__fit">FIT</span>
          <span className="hero__combat">COMBAT</span>
        </h1>
        <p className="hero__zone">
          <span>CHALLENGE ZONE</span>
        </p>
        <p className="hero__tagline">Push your limits.</p>

        <div className="hero__cta">
          <a href="#tickets" className="btn btn--gold btn--lg">
            <TicketIcon width={22} height={22} /> Buy ticket · {formatNaira(EVENT.price)}
          </a>
          <a href="#details" className="btn btn--ghost btn--lg">
            Event details
          </a>
        </div>
      </div>
    </header>

    {/* ---------- Pillars ---------- */}
    <section className="pillars" aria-label="What FIT COMBAT is about">
      <div className="container pillars__grid">
        {pillars.map(({ label, Icon }) => (
          <div className="pillar" key={label}>
            <Icon width={26} height={26} />
            <span>{label}</span>
          </div>
        ))}
      </div>
    </section>

    {/* ---------- Details ---------- */}
    <section className="section" id="details">
      <div className="container">
        <p className="kicker">The event</p>
        <h2 className="section__title">Save the date</h2>

        <div className="details">
          <article className="detail">
            <CalendarIcon width={30} height={30} />
            <p className="detail__label">Date</p>
            <p className="detail__value">{EVENT.dateLabel}</p>
            <p className="detail__sub">{EVENT.weekday}</p>
          </article>

          <article className="detail">
            <ClockIcon width={30} height={30} />
            <p className="detail__label">Time</p>
            <p className="detail__value">{EVENT.timeLabel}</p>
            <p className="detail__sub">Doors open early — don’t be late</p>
          </article>

          <article className="detail detail--venue">
            <PinIcon width={30} height={30} />
            <p className="detail__label">Venue</p>
            <p className="detail__value">{EVENT.venueName}</p>
            <p className="detail__sub">{EVENT.venueLines.join(", ")}</p>
            <a className="detail__link" href={EVENT.mapsUrl} target="_blank" rel="noreferrer">
              Open in Google Maps →
            </a>
          </article>

          <article className="detail detail--price">
            <TicketIcon width={30} height={30} />
            <p className="detail__label">Ticket</p>
            <p className="detail__value detail__value--gold">{formatNaira(EVENT.price)}</p>
            <p className="detail__sub">Per person · Instant PDF ticket</p>
          </article>
        </div>

        <div className="countdown-wrap">
          <p className="kicker">Countdown to the challenge</p>
          <Countdown target={EVENT.startsAt} />
        </div>
      </div>
    </section>

    {/* ---------- Tickets ---------- */}
    <section className="section section--alt" id="tickets">
      <div className="container tickets">
        <div className="tickets__copy">
          <p className="kicker">Tickets</p>
          <h2 className="section__title">Secure your spot</h2>
          <p className="muted lead">
            Every ticket carries its own unique number. Pay once, and your
            ticket is emailed to you as a PDF — ready to show at the door.
          </p>

          <ol className="steps">
            {steps.map(([title, text], i) => (
              <li key={title}>
                <span className="steps__n">{i + 1}</span>
                <div>
                  <strong>{title}</strong>
                  <span>{text}</span>
                </div>
              </li>
            ))}
          </ol>

          <TicketPreview />
        </div>

        <div className="tickets__form">
          <TicketForm />
        </div>
      </div>
    </section>

    <Footer />
  </div>
);

export default LandingPage;
