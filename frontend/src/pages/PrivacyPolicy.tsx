import { Link } from 'react-router-dom';
import { textLink } from '../components/Card';
import { Bullets, ContactEmail, LegalPage, Section, Term, operator } from '../components/Legal';
import { openCookieSettings } from '../lib/consent';

// Keep this true to the code: what's stored (duove-backend/sql/schema.sql), who sees it
// (the edge functions) and what deleting does (the cascades). Change the date with the text.
export function PrivacyPolicy() {
  return (
    <LegalPage
      title="Privacy policy"
      updated="2026-10-26"
      summary={
        <Bullets>
          <li>What you put in Duove is shared with your partner, and with nobody else on Duove.</li>
          <li>No ads, no analytics, and your data is never sold.</li>
          <li>Cycle logs are health data. Duove only collects them if you choose to track, and only shows them to your partner.</li>
          <li>You can delete your account from your profile at any time, and your data goes with it.</li>
        </Bullets>
      }
    >
      <Section id="who" title="Who runs Duove">
        <p>
          Duove is run by {operator}, an individual developer based in the Philippines ("we", "us"). We decide how the
          information in Duove is used, which makes us its personal information controller under the Data Privacy Act of
          2012 (Republic Act No. 10173).
        </p>
        <p>
          This policy explains what Duove collects, why, who can see it and what you can do about it. If you use Duove from
          the European Economic Area or the United Kingdom, you also have the rights the GDPR gives you, and this policy
          covers them.
        </p>
        <p>Questions or requests: <ContactEmail />.</p>
      </Section>

      <Section id="collect" title="What Duove collects">
        <Bullets>
          <li>
            <Term>Your account.</Term> Your email address and password, the username you give when you sign up (optional),
            your display name, your profile photo if you add one, and when you joined. Your password is stored as a secure
            hash, so nobody at Duove can read it. Your photo sits at a web address that isn't listed anywhere, but anyone who
            has that address can open it.
          </li>
          <li>
            <Term>Your relationship.</Term> The invite code, who you're paired with, when you paired, your anniversary if you
            add it, and the question topic you prefer.
          </li>
          <li>
            <Term>What you write.</Term> Love letters: the heading, the message, the names you sign with, any song you attach
            (saved as its Spotify ID, title, artist and cover link) and when each letter was opened. Cravings, with their
            category and whether they're done. Your daily answers and the questions you skip. When you last read your
            notifications.
          </li>
          <li>
            <Term>Your cycle, if you choose to track it.</Term> Your answer to "Do you have periods?", the start and end dates
            of your periods, and what you log on a day: bleeding, symptoms, moods, discharge, sex drive, sexual activity,
            sleep, stress and alcohol.
          </li>
          <li>
            <Term>Requests and sign-ins.</Term> Like any website, the services Duove runs on record your IP address, your
            browser and the time of each request and sign-in, to run the service and protect it.
          </li>
          <li>
            <Term>On your device.</Term> Your browser keeps your sign-in and a few settings, and more only with your OK. The{' '}
            <Link to="/cookies" className={textLink}>cookie policy</Link> lists all of it.
          </li>
        </Bullets>
        <p>
          Duove doesn't use analytics, advertising or tracking tools, and doesn't collect your location, your contacts or
          anything from other apps.
        </p>
      </Section>

      <Section id="cycle" title="Cycle and health data">
        <p>
          Your periods and day logs are information about your health and sex life, which the law treats as sensitive.
          Duove only collects them after you choose "Yes, track my cycle", or "Track my cycle" in your profile. That choice
          is your consent.
        </p>
        <p>
          While you track, your partner sees your periods, the predictions and your day logs. Duove uses them only to show
          your cycle to the two of you. They're never used for ads, never sold and never used to build a profile of you.
        </p>
        <p>
          To stop, choose "Stop tracking my cycle" in your profile. Your partner stops seeing your cycle at once. What you
          logged before stays saved, in case you start again, until you remove it: delete a period or clear a day in the
          tracker, leave your relationship, delete your account, or ask us to erase it.
        </p>
        <p>
          Predictions are estimates. They aren't medical advice and they aren't birth control, as the{' '}
          <Link to="/terms#health" className={textLink}>terms of service</Link> explain.
        </p>
      </Section>

      <Section id="use" title="How Duove uses it">
        <p>Only to run Duove for you and your partner:</p>
        <Bullets>
          <li>Showing your partner what you share, and working out countdowns, predictions and notifications.</li>
          <li>Keeping accounts secure, sending account emails like password resets, and stopping abuse.</li>
          <li>Finding and fixing problems.</li>
          <li>Answering you when you get in touch.</li>
        </Bullets>
        <p>
          We don't sell or rent your information, show ads, build profiles of you, or use what you write to train AI. We
          don't look at your letters, answers, cravings or logs unless you ask us to help with something, or the law
          requires it.
        </p>
      </Section>

      <Section id="basis" title="Why Duove may use it">
        <Bullets>
          <li>
            <Term>To provide Duove.</Term> Most of what Duove does is what you signed up for: keeping your account and showing
            your partner what you share.
          </li>
          <li>
            <Term>Your consent.</Term> For your cycle and day logs, and for the optional storage in the cookie settings. You
            can withdraw it at any time. That stops further use, but doesn't change what happened before.
          </li>
          <li>
            <Term>Keeping Duove safe and working.</Term> Security records and fixing problems serve our legitimate interest in
            a service that's safe to use.
          </li>
          <li>
            <Term>The law.</Term> When the law requires us to keep or share something.
          </li>
        </Bullets>
        <p>
          These are the grounds the Data Privacy Act allows in sections 12 and 13, and, for people in the EEA or UK, the
          GDPR allows in articles 6 and 9.
        </p>
      </Section>

      <Section id="partner" title="What your partner sees">
        <p>Duove is built for two, so what you add is shared with the person you pair with:</p>
        <Bullets>
          <li>Your display name, your photo and when you joined.</li>
          <li>The letters you send them. Each of you can see whether the other has opened a letter.</li>
          <li>Your cravings, and when you mark them done.</li>
          <li>Your daily answers. Yours stays face down until they've sent theirs.</li>
          <li>Your anniversary date.</li>
          <li>Your cycle and day logs, while you track them.</li>
        </Bullets>
        <p>
          They never see your email address, and nobody else on Duove sees any of it. If either of you leaves the
          relationship, it's deleted with everything in it, for both of you.
        </p>
      </Section>

      <Section id="providers" title="Who else handles it">
        <p>A few companies run parts of Duove for us. They handle your information only to provide their service to Duove.</p>
        <Bullets>
          <li>
            <Term>Supabase</Term> holds Duove's database and photos, handles sign-in, runs Duove's server code and sends
            account emails. Its servers for Duove are in Singapore. Read{' '}
            <a href="https://supabase.com/privacy" className={textLink}>Supabase's privacy policy</a>.
          </li>
          <li>
            <Term>Vercel</Term> hosts the Duove website and sees your IP address when it delivers a page. Read{' '}
            <a href="https://vercel.com/legal/privacy-policy" className={textLink}>Vercel's privacy policy</a>.
          </li>
          <li>
            <Term>Spotify</Term> provides the songs in letters. When you search for a song, Duove's server asks Spotify for
            you, so Spotify gets the words you searched but not who you are. Cover images in the results load from Spotify.
            The player in a letter loads from Spotify only if you allow it, and then{' '}
            <a href="https://www.spotify.com/legal/privacy-policy/" className={textLink}>Spotify's privacy policy</a> applies.
          </li>
        </Bullets>
        <p>
          Otherwise we share information only when the law requires it, or if Duove ever passes to someone else, and then
          we'll tell you first. We never sell it.
        </p>
      </Section>

      <Section id="storage" title="Where it's stored">
        <p>
          Duove's database, photos and server code run in Singapore. Vercel delivers the website from servers around the
          world, including the United States. Each provider is bound by data processing terms to protect your information
          wherever it handles it.
        </p>
      </Section>

      <Section id="retention" title="How long Duove keeps it">
        <p>As long as your account exists, unless you delete it sooner:</p>
        <Bullets>
          <li>
            You can delete cravings, periods and day logs one at a time. Letters and answers can't be deleted one by one:
            leaving the relationship or deleting your account removes them, or you can ask us.
          </li>
          <li>
            <Term>Leaving your relationship</Term> deletes it and everything in it for both of you: letters, cravings,
            answers, and cycle and day logs.
          </li>
          <li>
            <Term>Deleting your account</Term> deletes your account, profile and photo, and your relationship with everything
            in it for both of you, right away.
          </li>
        </Bullets>
        <p>
          Backups may hold deleted information for a short time until they're replaced. Request and sign-in records stay
          with Supabase and Vercel for as long as their own policies set.
        </p>
      </Section>

      <Section id="security" title="How it's protected">
        <p>
          Everything travels over encrypted connections, and Supabase encrypts what it stores. Passwords are stored as secure
          hashes. Access rules let only you and your partner reach what you share, and your cycle only leaves Duove's server
          after it checks that you're sharing it.
        </p>
        <p>
          No system is perfectly secure. If a breach puts your information at risk, we'll tell you and the National Privacy
          Commission, as the law requires.
        </p>
      </Section>

      <Section id="rights" title="Your rights">
        <p>
          The Data Privacy Act gives you the right to be informed, to access your information, to correct it, to object to
          its use, to have it erased or blocked, to get a copy you can take elsewhere, to claim damages and to complain.
          People in the EEA and UK have the same rights under the GDPR.
        </p>
        <Bullets>
          <li>Correct your name and photo in your profile.</li>
          <li>Delete your account from your profile.</li>
          <li>
            Turn cycle tracking off in your profile, and change what's stored on this device in the{' '}
            <button type="button" onClick={openCookieSettings} className={textLink}>cookie settings</button>.
          </li>
          <li>
            For a copy of your information, or anything else, email <ContactEmail />. We'll reply within 30 days, and may
            first check that the request comes from your account's email address.
          </li>
        </Bullets>
        <p>
          If you think we've mishandled your information, you can complain to the{' '}
          <a href="https://privacy.gov.ph" className={textLink}>National Privacy Commission</a>, or to your data protection
          authority if you're in the EEA or UK.
        </p>
      </Section>

      <Section id="age" title="Age">
        <p>
          Duove is for people 18 and older. We don't knowingly collect information from anyone younger, and we delete an
          account when we learn it belongs to someone under 18.
        </p>
      </Section>

      <Section id="changes" title="Changes to this policy">
        <p>When this policy changes, so does the date at the top. Before a significant change applies, we'll tell you in Duove.</p>
      </Section>

      <Section id="contact" title="Contact">
        <p>Questions, requests or worries about your privacy: <ContactEmail />.</p>
      </Section>
    </LegalPage>
  );
}
