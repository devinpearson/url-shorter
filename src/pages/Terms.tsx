import { Link } from "react-router-dom";
import { LegalPage, LegalSection } from "../components/LegalPage";

export default function Terms() {
  return (
    <LegalPage
      title="Terms of Use"
      updated="7 November 2026"
      intro={
        <p>
          Club Links is a free link shortener for Toastmasters clubs to share meeting sign-ups,
          online meeting links, guest forms and similar pages. By creating an account or a short
          link you agree to these terms. If you don&apos;t agree, please don&apos;t use the site.
        </p>
      }
    >
      <LegalSection title="1. Who runs this site">
        <p>
          The site is built and run by Devin Pearson, a Toastmasters member, as a personal project.
          It is independent and unofficial: it is <strong>not</strong> affiliated with, endorsed by,
          sponsored by or operated by Toastmasters International or any of its districts.
        </p>
        <p>
          &ldquo;Toastmasters International&rdquo;, &ldquo;Toastmasters&rdquo; and the Toastmasters
          emblem are trademarks of Toastmasters International. This site claims no ownership of
          them.
        </p>
      </LegalSection>

      <LegalSection title="2. Your account">
        <p>
          You log in through our sign-in provider (Auth0). You are responsible for the short links
          created with your account and for keeping access to it secure. One person may manage links
          for their club; please don&apos;t share an account between people you don&apos;t trust
          with all of its links.
        </p>
      </LegalSection>

      <LegalSection title="3. Your links">
        <p>
          You are responsible for where your short links point. A short link should send people to a
          page about your club or its meetings, events or members&apos; Toastmasters activities.
        </p>
        <p>
          Short names are given on a first-come, first-served basis and don&apos;t give you any
          ownership of that name. They aren&apos;t case-sensitive, so &ldquo;Sunrise-Zoom&rdquo; and
          &ldquo;sunrise-zoom&rdquo; are the same link. Some names are reserved for the site itself.
          Links can be deleted by you at any time.
        </p>
      </LegalSection>

      <LegalSection title="4. Acceptable use">
        <p>Please don&apos;t use Club Links to:</p>
        <ul>
          <li>link to spam, phishing, malware, scams or anything illegal;</li>
          <li>hide where a link really goes in order to mislead people;</li>
          <li>
            present your page as official Toastmasters International content, or choose a name that
            suggests a club, district or person you don&apos;t represent;
          </li>
          <li>
            link to content that is hateful, harassing, sexually explicit or that infringes
            someone&apos;s rights;
          </li>
          <li>
            create links in bulk, send automated traffic, or try to break, overload or get around
            the site&apos;s security or limits.
          </li>
        </ul>
        <p>
          Links or accounts that break these rules may be disabled or removed without notice. To
          report a link, use the <Link to="/contact">contact form</Link>.
        </p>
      </LegalSection>

      <LegalSection title="5. What we store">
        <p>
          When you log in we store your name and email address from the sign-in provider. For each
          short link we store its name, the address it points to, when it was created and a count of
          how many times it was opened. We don&apos;t record who opened a link.
        </p>
        <p>
          A cookie keeps you logged in; it isn&apos;t used for advertising or tracking. Messages
          sent through the contact form, with the name and email address you give, are kept so they
          can be answered. Your information isn&apos;t sold or shared, except with the services
          needed to run the site (hosting, database, sign-in and email).
        </p>
        <p>
          To have your account and links deleted, use the <Link to="/contact">contact form</Link>.
        </p>
      </LegalSection>

      <LegalSection title="6. No warranty">
        <p>
          The site is provided free, &ldquo;as is&rdquo; and &ldquo;as available&rdquo;, without
          warranties of any kind. Short links may stop working if the site is unavailable, changes
          or closes, so keep the original addresses of anything important.
        </p>
      </LegalSection>

      <LegalSection title="7. Limitation of liability">
        <p>
          To the extent the law allows, the site&apos;s owner is not liable for any loss or damage
          arising from using the site, from the pages short links point to, or from the site or a
          link being unavailable.
        </p>
      </LegalSection>

      <LegalSection title="8. Other sites">
        <p>
          Short links lead to sites run by others. Those sites aren&apos;t checked or endorsed by
          Club Links and have their own terms and privacy policies.
        </p>
      </LegalSection>

      <LegalSection title="9. Changes">
        <p>
          The site, its features and these terms can change, or the site can be paused or closed, at
          any time. The date at the top shows when these terms last changed; using the site after a
          change means you accept the new terms.
        </p>
      </LegalSection>

      <LegalSection title="10. Contact">
        <p>
          Questions, reports or requests about these terms can be sent through the{" "}
          <Link to="/contact">contact page</Link>.
        </p>
      </LegalSection>
    </LegalPage>
  );
}
