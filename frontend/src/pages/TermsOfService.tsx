import { Link } from 'react-router-dom';
import { textLink } from '../components/Card';
import { Bullets, ContactEmail, LegalPage, Section, operator } from '../components/Legal';

export function TermsOfService() {
  return (
    <LegalPage
      title="Terms of service"
      updated="2026-10-26"
      summary={
        <Bullets>
          <li>Duove is a private space for two. Be kind, be lawful, and only pair with someone who wants to pair with you.</li>
          <li>What you write stays yours. You let Duove store it and show it to your partner, nothing more.</li>
          <li>The cycle tracker gives estimates. It isn't medical advice or birth control.</li>
          <li>Duove is free and comes as is. You can leave any time.</li>
        </Bullets>
      }
    >
      <Section id="agreement" title="About these terms">
        <p>
          These terms are an agreement between you and {operator}, who runs Duove ("we", "us"). By creating an account or
          using Duove, you agree to them. If you don't agree, please don't use Duove.
        </p>
        <p>
          The <Link to="/privacy" className={textLink}>privacy policy</Link> and the{' '}
          <Link to="/cookies" className={textLink}>cookie policy</Link> explain how Duove handles your information.
        </p>
      </Section>

      <Section id="account" title="Your account">
        <Bullets>
          <li>You must be 18 or older to use Duove.</li>
          <li>One account per person, with an email address you can use.</li>
          <li>Keep your password to yourself. You're responsible for what happens in your account.</li>
          <li>If you think someone else got in, change your password and tell us at <ContactEmail />.</li>
        </Bullets>
      </Section>

      <Section id="pairing" title="You and your partner">
        <p>
          Duove connects two accounts with an invite code. Only pair with someone who wants to pair with you. Once you're
          paired, each of you sees what the other shares, as the{' '}
          <Link to="/privacy#partner" className={textLink}>privacy policy</Link> describes.
        </p>
        <p>
          Either of you can leave the relationship at any time from your profile. Leaving, or deleting your account, deletes
          the relationship and everything in it for both of you, including what your partner wrote. It can't be undone.
        </p>
      </Section>

      <Section id="content" title="Your content">
        <p>
          What you write in Duove stays yours. You give us permission to store it, back it up and show it to you and your
          partner, only so Duove can work. That permission ends when the content is deleted, apart from short-lived backups.
        </p>
        <p>You're responsible for what you post. Don't share someone else's private information without their OK.</p>
      </Section>

      <Section id="use" title="Using Duove fairly">
        <p>Don't use Duove to:</p>
        <Bullets>
          <li>Break the law, or help someone else break it.</li>
          <li>Harass, threaten, stalk or pressure anyone, your partner included.</li>
          <li>Watch or track someone without their agreement.</li>
          <li>Share sexual content involving anyone under 18, or any other illegal content.</li>
          <li>
            Get into other people's accounts or data, test or break Duove's security, overload it, scrape it, or reverse
            engineer it beyond what the law allows.
          </li>
          <li>Run a business, or sell or rent access to Duove.</li>
        </Bullets>
        <p>
          If you ever feel unsafe with your partner, you can leave the relationship from your profile, which ends their
          access at once. Leaving deletes what's in it, so keep copies of anything you may need first. Then reach out to
          people you trust or your local authorities.
        </p>
      </Section>

      <Section id="health" title="Cycle tracker and health">
        <p>
          The cycle tracker estimates periods and fertile windows from what you log. It isn't medical advice, diagnosis or
          treatment, and it isn't a form of birth control. Don't rely on its predictions to avoid or plan a pregnancy.
        </p>
        <p>For anything about your health, talk to a doctor or other health professional. In an emergency, call your local emergency number.</p>
      </Section>

      <Section id="third-parties" title="Spotify and other services">
        <p>
          Songs in letters come from Spotify. When you use Spotify's player or open a song on Spotify, Spotify's own terms
          and privacy policy apply. We aren't responsible for services Duove doesn't run.
        </p>
      </Section>

      <Section id="service" title="Free, and as is">
        <p>Duove is free. If paid features ever come, we'll tell you first, and you'll never be charged without agreeing.</p>
        <p>We may change, pause or stop features, or Duove itself. Before shutting Duove down, we'll give reasonable notice.</p>
        <p>
          Duove is provided "as is" and "as available". As far as the law allows, we don't promise that it will always be
          available, that it will be free of errors, or that its predictions will be accurate.
        </p>
      </Section>

      <Section id="liability" title="Liability">
        <p>
          As far as the law allows, we aren't liable for indirect or consequential losses, for lost data, or for decisions
          made on Duove's predictions. Our total liability to you is limited to ₱5,000.
        </p>
        <p>
          Nothing in these terms limits liability that the law doesn't allow to be limited, such as for fraud, gross
          negligence or wilful misconduct.
        </p>
      </Section>

      <Section id="ending" title="Ending your account">
        <p>
          You can delete your account at any time from your profile. We may suspend or close an account that breaks these
          terms or the law, or to protect others, and we'll tell you first when we reasonably can.
        </p>
        <p>
          The parts of these terms that by their nature should outlast an account, such as the limits on liability and the
          governing law, still apply after it ends.
        </p>
      </Section>

      <Section id="changes" title="Changes to these terms">
        <p>
          When these terms change, so does the date at the top. Before a significant change applies, we'll tell you in
          Duove. If you keep using Duove after that, you accept the new terms. If you don't accept them, you can delete your
          account.
        </p>
      </Section>

      <Section id="law" title="Governing law">
        <p>
          These terms are governed by the laws of the Republic of the Philippines. If something goes wrong, email us first
          and we'll try to sort it out. If we can't, disputes go to the courts of the Philippines. If you live elsewhere,
          you keep the consumer protections your own country's laws give you.
        </p>
      </Section>

      <Section id="contact" title="Contact">
        <p>Questions about these terms: <ContactEmail />.</p>
      </Section>
    </LegalPage>
  );
}
